import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import assert from 'assert';
import BigNumber from 'bignumber.js/bignumber.mjs';
import { Logger } from 'log4js';
import { FungibleToken, FungibleTokenAdmin } from 'mina-fungible-token';
import { AccountUpdate, Bool, fetchAccount, Mina, PrivateKey, PublicKey, Signature, UInt64 } from 'o1js';

import { DECIMAL_BASE, EEventStatus, ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { EError } from '../../constants/error.constant.js';
import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { MultiSignatureRepository } from '../../database/repositories/multi-signature.repository.js';
import { TokenPairRepository } from '../../database/repositories/token-pair.repository.js';
import { TokenPriceRepository } from '../../database/repositories/token-price.repository.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { addDecimal, calculateFee } from '../../shared/utils/bignumber.js';
import { TokenPair } from '../users/entities/tokenpair.entity.js';
import { CommonConfig } from './entities/common-config.entity.js';
import { MultiSignature } from './entities/multi-signature.entity.js';
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
  private readonly validatorThreshhold;
  constructor(
    private readonly configService: ConfigService,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly tokenPairRepository: TokenPairRepository,
    private readonly tokenPriceRepository: TokenPriceRepository,
    private readonly multiSignatureRepository: MultiSignatureRepository,
    private readonly loggerService: LoggerService,
  ) {
    this.logger = this.loggerService.getLogger('SENDER_MINA_BRIDGE');
    this.feePayerKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.SIGNER_MINA_PRIVATE_KEY));
    this.bridgeKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_SC_PRIVATE_KEY));
    this.tokenPublicKey = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS));
    this.validatorThreshhold = this.configService.get(EEnvKey.MINA_VALIDATOR_THRESHHOLD);

    const network = Mina.Network({
      mina: this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS),
      archive: this.configService.get(EEnvKey.MINA_BRIDGE_ARCHIVE_RPC_OPTIONS),
    });
    Mina.setActiveInstance(network);
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
  ): { amountReceived: string; protocolFeeAmount: string } {
    const amountReceiveConvert = BigNumber(amountFrom)
      .dividedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.fromDecimal))
      .multipliedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.toDecimal))
      .toString();
    const protocolFeeAmount = BigNumber(
      calculateFee(
        amountReceiveConvert,
        addDecimal(this.configService.get(EEnvKey.GASFEEMINA), this.configService.get(EEnvKey.DECIMAL_TOKEN_MINA)),
        config.tip,
      ),
    )
      .toFixed(0)
      .toString();
    const amountReceived = BigNumber(amountReceiveConvert).minus(protocolFeeAmount).toFixed(0).toString();
    return { amountReceived, protocolFeeAmount };
  }
  public async handleUnlockMina() {
    let dataLock, configTip, rateethmina;
    try {
      [dataLock, configTip, { rateethmina }] = await Promise.all([
        this.eventLogRepository.getEventLockWithNetwork(ENetworkName.MINA, this.validatorThreshhold),
        this.commonConfigRepository.getCommonConfig(),
        this.tokenPriceRepository.getRateETHToMina(),
      ]);
      if (!dataLock) {
        this.logger.warn('No pending lock transaction!');
        return;
      }
      await this.eventLogRepository.updateLockEvenLog(dataLock.id, EEventStatus.PROCESSING);

      const { tokenReceivedAddress, tokenFromAddress, id, receiveAddress, amountFrom, senderAddress } = dataLock;
      const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);
      if (!tokenPair) {
        this.logger.warn('Token pair not found.');
        await this.eventLogRepository.updateStatusAndRetryEvenLog({
          id: dataLock.id,
          retry: dataLock.retry,
          status: EEventStatus.NOTOKENPAIR,
        });
        return;
      }

      const isPassDailyQuota = await this.isPassDailyQuota(senderAddress, tokenPair.fromDecimal);
      if (!isPassDailyQuota) {
        this.logger.warn('Passed daily quota.');
        await this.eventLogRepository.updateStatusAndRetryEvenLog({
          id: dataLock.id,
          retry: dataLock.retry,
          status: EEventStatus.FAILED,
          errorDetail: EError.OVER_DAILY_QUOTA,
        });
        return;
      }
      const { amountReceived, protocolFeeAmount } = this.getAmountReceivedAndFee(tokenPair, configTip, amountFrom);

      const rateMINAETH = Number(rateethmina.toFixed(0)) || 2000;
      const result = await this.callUnlockFunction(amountReceived, id, receiveAddress, protocolFeeAmount, rateMINAETH);
      // Update status eventLog when call function unlock
      if (result.success) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog({
          id: dataLock.id,
          retry: dataLock.retry,
          status: EEventStatus.PROCESSING,
          errorDetail: result.error,
          amountReceived,
          txHashUnlock: result.data,
          protocolFee: protocolFeeAmount,
        });
      } else {
        await this.eventLogRepository.updateStatusAndRetryEvenLog({
          id: dataLock.id,
          retry: Number(dataLock.retry + 1),
          status: EEventStatus.FAILED,
          errorDetail: JSON.stringify(result.error),
        });
      }
      return result;
    } catch (error) {
      await this.eventLogRepository.updateStatusAndRetryEvenLog({
        id: dataLock.id,
        retry: Number(dataLock.retry + 1),
        status: EEventStatus.FAILED,
        errorDetail: JSON.stringify(error),
      });
    }
  }

  private async callUnlockFunction(amount, txId, receiveAddress, protocolFeeAmount, rateMINAETH) {
    try {
      this.logger.info('compile the contract...');
      const generatedSignatures = await this.multiSignatureRepository.findBy({
        txId,
      });
      const [signatureData] = generatedSignatures.map(e => ({
        signature: Signature.fromJSON(JSON.parse(e.signature)),
        validator: PublicKey.fromBase58(e.validator),
      }));

      await this.compileContract();

      const fee = protocolFeeAmount * rateMINAETH + +this.configService.get(EEnvKey.BASE_MINA_BRIDGE_FEE); // in nanomina (1 billion = 1.0 mina)
      const feePayerPublicKey = this.feePayerKey.toPublicKey();
      const bridgePublicKey = this.bridgeKey.toPublicKey();
      const receiverPublicKey = PublicKey.fromBase58(receiveAddress);

      const zkBridge = new Bridge(bridgePublicKey);
      const token = new FungibleToken(this.tokenPublicKey);

      await Promise.all([
        fetchAccount({ publicKey: bridgePublicKey }),
        fetchAccount({ publicKey: feePayerPublicKey }),
        fetchAccount({ publicKey: receiverPublicKey, tokenId: token.deriveTokenId() }),
        fetchAccount({
          publicKey: this.tokenPublicKey,
          tokenId: token.deriveTokenId(),
        }),
      ]);

      const hasAccount = Mina.hasAccount(receiverPublicKey, token.deriveTokenId());

      const typedAmount = UInt64.from(amount);

      const signerPrivateKey = PrivateKey.fromBase58('EKE8MzLKBQQn3v53v6JSCXHRPvrTwAB6xytnxYfpATgYnX17bMeM');

      const msg = [...receiverPublicKey.toFields(), ...typedAmount.toFields(), ...this.tokenPublicKey.toFields()];
      const signature = Signature.create(signerPrivateKey, msg);
      this.logger.info('Receivier token account status = ', hasAccount);
      // compile the contract to create prover keys
      // call update() and send transaction
      const validator2Privkey = PrivateKey.fromBase58('EKF3PE1286RVzZNgieYeDw96LrMKc6V2szhvV2zyj2Z9qLwzc1SG');
      const validator3Privkey = PrivateKey.fromBase58('EKEqLGiiuaZwAV5XZeWGWBsQUmBCXAWR5zzq2vZtyCXou7ZYwryi');
      const validator2 = validator2Privkey.toPublicKey();
      const validator3 = validator3Privkey.toPublicKey();

      this.logger.info('build transaction and create proof...');
      const tx = await Mina.transaction({ sender: feePayerPublicKey, fee }, async () => {
        if (!hasAccount) AccountUpdate.fundNewAccount(feePayerPublicKey);
        await zkBridge.unlock(
          typedAmount,
          receiverPublicKey,
          UInt64.from(txId),
          this.tokenPublicKey,
          Bool(true),
          signerPrivateKey.toPublicKey(),
          signature,
          Bool(false),
          validator2, // hardcoded
          signatureData.signature,
          Bool(false),
          validator3, // hardcoded
          signatureData.signature,
        );
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
  async handleValidateUnlockTxMina() {
    let dataLock, config;
    const signerPrivateKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.MINA_VALIDATOR_PRIVATE_KEY));
    const signerPublicKey = PublicKey.fromPrivateKey(signerPrivateKey).toBase58();
    try {
      [dataLock, config] = await Promise.all([
        this.eventLogRepository.getValidatorPendingSignature(signerPublicKey, ENetworkName.MINA),
        this.commonConfigRepository.getCommonConfig(),
      ]);

      if (!dataLock) {
        return;
      }

      const { tokenReceivedAddress, tokenFromAddress, receiveAddress, amountFrom } = dataLock;

      const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);

      if (!tokenPair) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog({
          id: dataLock.id,
          retry: dataLock.retry,
          status: EEventStatus.NOTOKENPAIR,
        });
        return;
      }
      // check if this signature has been tried before.
      let multiSignature = await this.multiSignatureRepository.findOneBy({
        txId: dataLock.id,
        validator: signerPublicKey,
      });
      if (!multiSignature) {
        multiSignature = new MultiSignature({
          chain: ENetworkName.MINA,
          validator: signerPublicKey,
          txId: dataLock.id,
        });
      }

      const receiverPublicKey = PublicKey.fromBase58(receiveAddress);
      const { amountReceived } = this.getAmountReceivedAndFee(tokenPair, config, amountFrom);

      const msg = [
        ...receiverPublicKey.toFields(),
        ...UInt64.from(amountReceived).toFields(),
        ...this.tokenPublicKey.toFields(),
      ];
      const signature = Signature.create(signerPrivateKey, msg);

      multiSignature.signature = signature.toJSON();
      await this.multiSignatureRepository.save(multiSignature);
    } catch (error) {
      this.logger.log(EError.INVALID_SIGNATURE, error);
      await this.multiSignatureRepository.upsertErrorAndRetryMultiSignature(signerPublicKey, dataLock.id, error);
    }
  }
}
