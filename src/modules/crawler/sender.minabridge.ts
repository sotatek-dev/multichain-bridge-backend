import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import assert from 'assert';
import BigNumber from 'bignumber.js/bignumber.mjs';
import { Logger } from 'log4js';
import { FungibleToken, FungibleTokenAdmin } from 'mina-fungible-token';
import { AccountUpdate, Bool, fetchAccount, Mina, PrivateKey, PublicKey, Signature, UInt64 } from 'o1js';
import { Not } from 'typeorm';

import { DECIMAL_BASE, EEventStatus, ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { EError } from '../../constants/error.constant.js';
import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { MultiSignatureRepository } from '../../database/repositories/multi-signature.repository.js';
import { TokenPairRepository } from '../../database/repositories/token-pair.repository.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { QueueService } from '../../shared/modules/queue/queue.service.js';
import { addDecimal, calculateFee, calculateTip } from '../../shared/utils/bignumber.js';
import { TokenPair } from '../users/entities/tokenpair.entity.js';
import { CommonConfig } from './entities/common-config.entity.js';
import { MultiSignature } from './entities/multi-signature.entity.js';
import { JobUnlockProvider } from './job-unlock.provider.js';
import { Bridge } from './minaSc/Bridge.js';
import { Manager } from './minaSc/Manager.js';
import { ValidatorManager } from './minaSc/ValidatorManager.js';

@Injectable()
export class SenderMinaBridge {
  private readonly logger: Logger;
  private isContractCompiled = false;
  private readonly feePayerKey: PrivateKey;
  private readonly bridgeKey: PrivateKey;
  private readonly tokenPublicKey: PublicKey;
  constructor(
    private readonly configService: ConfigService,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly tokenPairRepository: TokenPairRepository,
    private readonly multiSignatureRepository: MultiSignatureRepository,
    private readonly loggerService: LoggerService,
    private readonly queueService: QueueService,
    private readonly unlockJobProvider: JobUnlockProvider,
  ) {
    this.logger = this.loggerService.getLogger('SENDER_MINA_BRIDGE');
    this.feePayerKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.SIGNER_MINA_PRIVATE_KEY));
    this.bridgeKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_SC_PRIVATE_KEY));
    this.tokenPublicKey = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS));

    const network = Mina.Network({
      mina: this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS),
      archive: this.configService.get(EEnvKey.MINA_BRIDGE_ARCHIVE_RPC_OPTIONS),
    });
    Mina.setActiveInstance(network);
  }
  private getContractsInfo() {
    this.logger.log('Bridge', this.bridgeKey.toPublicKey().toBase58());
    this.logger.log('FeePayer', this.feePayerKey.toPublicKey().toBase58());
    this.logger.log('Token', this.tokenPublicKey.toBase58());
  }
  private async compileContract() {
    if (!this.isContractCompiled) {
      await FungibleToken.compile();
      await FungibleTokenAdmin.compile();
      await Bridge.compile();
      await Manager.compile();
      await ValidatorManager.compile();
      this.isContractCompiled = true;
    }
  }
  private getAmountReceivedAndFee(
    tokenPair: TokenPair,
    config: CommonConfig,
    amountFrom: string,
  ): { amountReceived: string; protocolFeeAmount: string; tipAmount: string; gasFeeMina: string } {
    // convert decimal from ETH to MINA
    const amountReceiveConvert = BigNumber(amountFrom)
      .dividedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.fromDecimal))
      .multipliedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.toDecimal))
      .toString();
    const gasFeeMina = addDecimal(
      this.configService.get(EEnvKey.GASFEEMINA),
      this.configService.get(EEnvKey.DECIMAL_TOKEN_MINA),
    );
    // calc fee follow MINA decimal.
    const protocolFeeAmount = BigNumber(calculateFee(amountReceiveConvert, gasFeeMina, config.tip))
      .toFixed(0)
      .toString();
    const amountReceived = BigNumber(amountReceiveConvert).minus(protocolFeeAmount).toFixed(0).toString();
    return {
      amountReceived,
      protocolFeeAmount,
      tipAmount: calculateTip(amountReceiveConvert, gasFeeMina, config.tip)
        .div(BigNumber(DECIMAL_BASE).pow(tokenPair.toDecimal))
        .toString(),
      gasFeeMina: this.configService.get(EEnvKey.GASFEEMINA),
    };
  }
  public async handleUnlockMina(txId: number) {
    const [dataLock, configTip] = await Promise.all([
      this.eventLogRepository.findOneBy({ id: txId, networkReceived: ENetworkName.MINA }),
      this.commonConfigRepository.getCommonConfig(),
    ]);
    if (!dataLock) {
      this.logger.warn(`Not found tx with id ${txId}`);
      return;
    }

    await this.eventLogRepository.updateLockEvenLog(dataLock.id, EEventStatus.PROCESSING);
    const { tokenReceivedAddress, tokenFromAddress, id, receiveAddress, amountFrom, senderAddress } = dataLock;
    const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);
    if (!tokenPair) {
      this.logger.warn('Token pair not found.');
      await this.eventLogRepository.updateStatusAndRetryEvenLog({
        id: dataLock.id,
        status: EEventStatus.NOTOKENPAIR,
      });
      return;
    }

    const isPassDailyQuota = await this.isPassDailyQuota(senderAddress, tokenPair.fromDecimal);
    if (!isPassDailyQuota) {
      this.logger.warn('Passed daily quota.');
      await this.eventLogRepository.updateStatusAndRetryEvenLog({
        id: dataLock.id,
        status: EEventStatus.FAILED,
        errorDetail: EError.OVER_DAILY_QUOTA,
      });
      return;
    }
    const { amountReceived, protocolFeeAmount, gasFeeMina, tipAmount } = this.getAmountReceivedAndFee(
      tokenPair,
      configTip,
      amountFrom,
    );
    const result = await this.callUnlockFunction(amountReceived, id, receiveAddress);
    // Update status eventLog when call function unlock
    if (result.success) {
      await this.eventLogRepository.updateStatusAndRetryEvenLog({
        id: dataLock.id,
        status: EEventStatus.PROCESSING,
        errorDetail: result.error,
        txHashUnlock: result.data,
        amountReceived,
        protocolFee: protocolFeeAmount,
        gasFee: gasFeeMina,
        tip: tipAmount,
      });
    } else {
      await this.eventLogRepository.updateStatusAndRetryEvenLog({
        id: dataLock.id,
        status: EEventStatus.FAILED,
        errorDetail: JSON.stringify(result.error),
      });
    }
    return result;
  }

  private async callUnlockFunction(amount: string, txId: number, receiveAddress: string) {
    try {
      const generatedSignatures = await this.multiSignatureRepository.findBy({
        txId,
      });
      const signatureData = generatedSignatures
        .map(e => [Bool(true), PublicKey.fromBase58(e.validator), Signature.fromJSON(JSON.parse(e.signature))])
        .flat(1);
      this.logger.info(`Found ${generatedSignatures.length} signatures for txId= ${txId}`);
      this.logger.info('compile the contract...');
      await this.compileContract();

      const fee = +this.configService.get(EEnvKey.BASE_MINA_BRIDGE_FEE); // in nanomina (1 billion = 1.0 mina)
      const feePayerPublicKey = this.feePayerKey.toPublicKey();
      const bridgePublicKey = this.bridgeKey.toPublicKey();
      const receiverPublicKey = PublicKey.fromBase58(receiveAddress);

      const zkBridge = new Bridge(bridgePublicKey);
      const token = new FungibleToken(this.tokenPublicKey);
      const tokenId = token.deriveTokenId();
      await Promise.all([
        fetchAccount({ publicKey: bridgePublicKey }),
        fetchAccount({ publicKey: feePayerPublicKey }),
        fetchAccount({ publicKey: receiverPublicKey, tokenId }),
        fetchAccount({
          publicKey: this.tokenPublicKey,
          tokenId,
        }),
      ]);
      const hasAccount = Mina.hasAccount(receiverPublicKey, tokenId);

      const typedAmount = UInt64.from(amount);

      this.logger.info(`Addr ${receiveAddress} token account status =  ${hasAccount}`);
      // compile the contract to create prover keys

      this.logger.info('build transaction and create proof...');
      const tx = await Mina.transaction({ sender: feePayerPublicKey, fee }, async () => {
        if (!hasAccount) AccountUpdate.fundNewAccount(feePayerPublicKey);
        await zkBridge.unlock(typedAmount, receiverPublicKey, UInt64.from(txId), this.tokenPublicKey, ...signatureData);
      });
      this.logger.info('Proving tx.');
      await tx.prove();
      this.logger.info('send transaction...');
      const sentTx = await tx.sign([this.feePayerKey, this.bridgeKey]).send();

      this.logger.info('Transaction waiting to be applied with txhash: ', sentTx.hash);
      await sentTx?.wait({ maxAttempts: 300 });

      assert(sentTx?.hash, 'transaction failed');
      return { success: true, error: null, data: sentTx.hash };
    } catch (error) {
      this.logger.error(error);
      return { success: false, error, data: null };
    }
  }

  private async isPassDailyQuota(address: string, fromDecimal: number): Promise<boolean> {
    const [dailyQuota, totalamount] = await Promise.all([
      await this.commonConfigRepository.getCommonConfig(),
      await this.eventLogRepository.sumAmountBridgeOfUserInDay(address),
    ]);

    if (
      totalamount &&
      BigNumber(totalamount.totalamount).isGreaterThanOrEqualTo(addDecimal(dailyQuota.dailyQuota, fromDecimal))
    ) {
      return false;
    }
    return true;
  }

  async handleValidateUnlockTxMina(txId: number) {
    assert(!!this.configService.get(EEnvKey.MINA_VALIDATOR_PRIVATE_KEY), 'invalid validator private key');
    assert(!!this.configService.get(EEnvKey.THIS_VALIDATOR_INDEX), 'invalid validator index');

    const signerPrivateKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.MINA_VALIDATOR_PRIVATE_KEY));
    const signerPublicKey = PublicKey.fromPrivateKey(signerPrivateKey).toBase58();
    const [dataLock, config] = await Promise.all([
      this.eventLogRepository.findOneBy({
        id: txId,
        networkReceived: ENetworkName.MINA,
        status: Not(EEventStatus.PROCESSING),
      }),
      this.commonConfigRepository.getCommonConfig(),
    ]);

    if (!dataLock) {
      this.logger.warn(`Data not found with id ${txId}`);
      return;
    }
    this.logger.info('Start generating mina signatures for tx', txId);

    const { tokenReceivedAddress, tokenFromAddress, receiveAddress, amountFrom } = dataLock;

    const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);

    if (!tokenPair) {
      this.logger.warn('Unknown token pair', tokenFromAddress, tokenReceivedAddress);
      await this.eventLogRepository.updateStatusAndRetryEvenLog({
        id: dataLock.id,
        status: EEventStatus.NOTOKENPAIR,
      });
      return;
    }

    // check if this signature has been tried before.
    let multiSignature = await this.multiSignatureRepository.findOneBy({
      txId: dataLock.id,
      validator: signerPublicKey,
    });
    if (multiSignature) {
      this.logger.warn('signature existed');
      return;
    }

    const receiverPublicKey = PublicKey.fromBase58(receiveAddress);
    const { amountReceived } = this.getAmountReceivedAndFee(tokenPair, config, amountFrom);

    const msg = [
      ...receiverPublicKey.toFields(),
      ...UInt64.from(amountReceived).toFields(),
      ...this.tokenPublicKey.toFields(),
    ];
    const signature = Signature.create(signerPrivateKey, msg).toJSON();

    multiSignature = new MultiSignature({
      chain: ENetworkName.MINA,
      validator: signerPublicKey,
      txId: dataLock.id,
      signature,
    });
    await this.multiSignatureRepository.save(multiSignature);
    // notice the job unlock provider here
  }
}
