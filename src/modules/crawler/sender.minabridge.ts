import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import assert from 'assert';
import { BigNumber } from 'bignumber.js';
import { FungibleToken, FungibleTokenAdmin } from 'mina-fungible-token';
import { AccountUpdate, Bool, fetchAccount, Mina, PrivateKey, PublicKey, Signature, UInt64 } from 'o1js';

import { DECIMAL_BASE, EEventStatus, ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { MultiSignatureRepository } from '../../database/repositories/multi-signature.repository.js';
import { TokenPairRepository } from '../../database/repositories/token-pair.repository.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { addDecimal, calculateFee } from '../../shared/utils/bignumber.js';
import { TokenPair } from '../users/entities/tokenpair.entity.js';
import { MultiSignature } from './entities/multi-signature.entity.js';
import { Bridge } from './minaSc/Bridge.js';
import { Manager } from './minaSc/Manager.js';
import { ValidatorManager } from './minaSc/ValidatorManager.js';

@Injectable()
export class SenderMinaBridge {
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
  ) {
    this.feePayerKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.SIGNER_MINA_PRIVATE_KEY)!);
    this.bridgeKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_SC_PRIVATE_KEY)!);
    this.tokenPublicKey = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS)!);

    const network = Mina.Network({
      mina: this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS),
      archive: this.configService.get(EEnvKey.MINA_BRIDGE_ARCHIVE_RPC_OPTIONS),
    });
    Mina.setActiveInstance(network);
  }
  private logger = this.loggerService.getLogger('SENDER_MINA_BRIDGE');
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
    tip: number,
    gasFee: number,
    amountFrom: string,
  ): { amountReceived: string; protocolFeeAmount: string } {
    // convert decimal from ETH to MINA
    const amountReceiveConvert = BigNumber(amountFrom)
      .dividedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.fromDecimal))
      .multipliedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.toDecimal))
      .toString();
    const gasFeeMina = addDecimal(gasFee, this.configService.get(EEnvKey.DECIMAL_TOKEN_MINA)!);
    // calc fee follow MINA decimal.
    const protocolFeeAmount = BigNumber(calculateFee(amountReceiveConvert, gasFeeMina, tip))
      .toFixed(0)
      .toString();
    const amountReceived = BigNumber(amountReceiveConvert).minus(protocolFeeAmount).toFixed(0).toString();
    return {
      amountReceived,
      protocolFeeAmount,
    };
  }
  public async handleUnlockMina(txId: number): Promise<{ error: Error | null; success: boolean }> {
    const dataLock = await this.eventLogRepository.findOneBy({ id: txId, networkReceived: ENetworkName.MINA });

    if (!dataLock) {
      this.logger.warn(`Not found tx with id ${txId}`);
      return { error: null, success: false };
    }
    try {
      assert(dataLock?.tip, 'invalid tip');
      assert(dataLock?.gasFee, 'invalid gasFee');
      assert(dataLock?.amountReceived, 'invalida amount to unlock');

      await this.eventLogRepository.updateLockEvenLog(dataLock.id, EEventStatus.PROCESSING);
      const { id, receiveAddress, amountReceived } = dataLock;

      const result = await this.callUnlockFunction(amountReceived, id, receiveAddress);
      // Update status eventLog when call function unlock
      if (result.success) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog({
          id: dataLock.id,
          status: EEventStatus.PROCESSING,
          errorDetail: result.error?.message,
          txHashUnlock: result.data!,
        });
      } else {
        if (result.error) {
          throw result.error;
        }
        throw new Error(`Tx ${txId} cannot be sent due to network error.`);
      }
      return result;
    } catch (error) {
      await this.eventLogRepository.updateStatusAndRetryEvenLog({
        id: dataLock.id,
        status: EEventStatus.FAILED,
        errorDetail: JSON.stringify(error),
      });
      return { error, success: false };
    }
  }

  private async callUnlockFunction(
    amount: string,
    txId: number,
    receiveAddress: string,
  ): Promise<{ success: boolean; error: Error | null; data: string | null }> {
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
      return { success: false, error: error as Error, data: null };
    }
  }

  async handleValidateUnlockTxMina(txId: number): Promise<{ error: Error | null; success: boolean }> {
    assert(!!this.configService.get(EEnvKey.MINA_VALIDATOR_PRIVATE_KEY), 'invalid validator private key');
    assert(!!this.configService.get(EEnvKey.THIS_VALIDATOR_INDEX), 'invalid validator index');

    const signerPrivateKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.MINA_VALIDATOR_PRIVATE_KEY)!);
    const signerPublicKey = PublicKey.fromPrivateKey(signerPrivateKey).toBase58();
    const dataLock = await this.eventLogRepository.findOneBy({
      id: txId,
      networkReceived: ENetworkName.MINA,
    });

    if (!dataLock) {
      this.logger.warn(`Data not found with id ${txId}`);
      return { error: null, success: false };
    }
    this.logger.info('Start generating mina signatures for tx', txId);

    assert(!!dataLock.amountReceived, 'invalid amount received');

    const { receiveAddress, amountReceived } = dataLock;

    // check if this signature has been tried before.
    let multiSignature = await this.multiSignatureRepository.findOneBy({
      txId: dataLock.id,
      validator: signerPublicKey,
    });
    if (multiSignature) {
      this.logger.warn('signature existed');
      return { error: null, success: false };
    }

    const receiverPublicKey = PublicKey.fromBase58(receiveAddress);

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
    return { error: null, success: true };
  }
}
