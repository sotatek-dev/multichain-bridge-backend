import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import assert from 'assert';
import { FungibleToken, FungibleTokenAdmin } from 'mina-fungible-token';
import { AccountUpdate, Bool, fetchAccount, Mina, PrivateKey, PublicKey, Signature, UInt64 } from 'o1js';

import { EEventStatus, ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { EError } from '../../constants/error.constant.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { MultiSignatureRepository } from '../../database/repositories/multi-signature.repository.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { canTxRetry } from '../../shared/utils/unlock.js';
import { MultiSignature } from './entities/multi-signature.entity.js';
import { Bridge } from './minaSc/Bridge.js';
import { Manager } from './minaSc/Manager.js';
import { ValidatorManager } from './minaSc/ValidatorManager.js';
import { LambdaService } from '../../shared/modules/aws/lambda.service.js';
import { getNextDayInUnix } from '../../shared/utils/time.js';
import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { EventLog } from './entities/event-logs.entity.js';
import { addDecimal } from '../../shared/utils/bignumber.js';
import { IsNull, Not } from 'typeorm';
import { getMinaNetworkId } from '../../shared/utils/util.js';

@Injectable()
export class SenderMinaBridge implements OnModuleInit {
  private isContractCompiled = false;
  private readonly feePayerPublicKey: PublicKey;
  private readonly bridgeBublicKey: PublicKey;
  private readonly tokenPublicKey: PublicKey;
  private readonly managerPublicKey: PublicKey;
  private readonly validatorManagerPublicKey: PublicKey
  constructor(
    private readonly configService: ConfigService,
    private readonly eventLogRepository: EventLogRepository,
    private readonly multiSignatureRepository: MultiSignatureRepository,
    private readonly loggerService: LoggerService,
    private readonly lambdaService: LambdaService,
    private readonly commonConfig: CommonConfigRepository
  ) {
    this.feePayerPublicKey = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_SIGNER_PUBLIC_KEY)!);
    this.bridgeBublicKey = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS)!);
    this.tokenPublicKey = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS)!);
    this.managerPublicKey = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_MANAGER_CONTRACT_ADDRESS)!);
    this.validatorManagerPublicKey = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_VALIDATOR_MANAGER_CONTRACT_ADDRESS)!)
    const network = Mina.Network({
      mina: this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS),
      archive: this.configService.get(EEnvKey.MINA_BRIDGE_ARCHIVE_RPC_OPTIONS),
      networkId: getMinaNetworkId()
    });
    Mina.setActiveInstance(network);
  }
  private logger = this.loggerService.getLogger('SENDER_MINA_BRIDGE');
  onModuleInit() {
    this.logger.info('Bridge', this.bridgeBublicKey.toBase58());
    this.logger.info('FeePayer', this.feePayerPublicKey.toBase58());
    this.logger.info('Token', this.tokenPublicKey.toBase58());
  }
  public async compileContract() {
    if (!this.isContractCompiled) {
      await FungibleToken.compile();
      await FungibleTokenAdmin.compile();
      await Bridge.compile();
      await Manager.compile();
      await ValidatorManager.compile();
      this.isContractCompiled = true;
    }
  }
  public async handleUnlockMina(txId: number): Promise<{ error: Error | null; success: boolean }> {
    const dataLock = await this.eventLogRepository.findOneBy({ id: txId, networkReceived: ENetworkName.MINA });

    if (!dataLock) {
      this.logger.warn(`Not found tx with id ${txId}`);
      return { error: null, success: false };
    }
    if (!canTxRetry(dataLock.status)) {
      this.logger.warn(`Tx cannot be retries ${txId}`);
      return { error: new Error(EError.DUPLICATED_ACTION), success: false };
    }
    try {
      assert(dataLock?.tip, 'invalid tip');
      assert(dataLock?.gasFee, 'invalid gasFee');
      assert(dataLock?.amountReceived, 'invalida amount to unlock');

      const { receiveAddress, amountReceived } = dataLock;
      const result = await this.callUnlockFunction(amountReceived, dataLock, receiveAddress);
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

  public async callUnlockFunction(
    amount: string,
    txData: EventLog,
    receiveAddress: string,
  ): Promise<{ success: boolean; error: Error | null; data: string | null }> {
    try {
      this.logger.info(`Bridge: ${this.bridgeBublicKey.toBase58()}\nToken: ${this.tokenPublicKey.toBase58}`);
      const generatedSignatures = await this.multiSignatureRepository.find({
        where: {
          txId: txData.id,
        },
        order: {
          index: 'asc'
        }
      });
      assert(generatedSignatures.length > 0)
      const signatureData = generatedSignatures
        .map((e) => [Bool(true), PublicKey.fromBase58(e.validator), Signature.fromJSON(JSON.parse(e.signature))])
        .flat(1);
      this.logger.info(`Found ${generatedSignatures.length} signatures for txId= ${txData.id}`);
      this.logger.info('compile the contract...');
      await this.compileContract();

      const fee = +this.configService.get(EEnvKey.BASE_MINA_BRIDGE_FEE); // in nanomina (1 billion = 1.0 mina)
      const receiverPublicKey = PublicKey.fromBase58(receiveAddress);

      const zkBridge = new Bridge(this.bridgeBublicKey);
      const token = new FungibleToken(this.tokenPublicKey);
      const tokenId = token.deriveTokenId();
      await Promise.all([
        fetchAccount({
          publicKey: this.validatorManagerPublicKey
        }),
        fetchAccount({
          publicKey: this.managerPublicKey
        }),
        fetchAccount({ publicKey: this.bridgeBublicKey }),
        fetchAccount({ publicKey: this.feePayerPublicKey }),
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
      const tx = await Mina.transaction({ sender: this.feePayerPublicKey, fee }, async () => {
        if (!hasAccount) AccountUpdate.fundNewAccount(this.feePayerPublicKey);
        await zkBridge.unlock(typedAmount, receiverPublicKey, UInt64.from(txData.id), this.tokenPublicKey, ...signatureData);
      });

      const sentTx = await this.handleSendTxMina(txData, tx);

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
      index: Number(this.configService.get(EEnvKey.THIS_VALIDATOR_INDEX)),
      txId: dataLock.id,
      signature,
    });
    await this.multiSignatureRepository.save(multiSignature);
    // notice the job unlock provider here
    this.logger.info('Done for tx ', txId);

    return { error: null, success: true };
  }
  public async handleSendTxMina(txData: EventLog, tx: Mina.Transaction<false, false>) {
    const commonConfig = await this.commonConfig.findOneBy({ id: Not(IsNull()) })
    assert(typeof commonConfig === 'object' && commonConfig?.dailyQuotaPerAddress && commonConfig.dailyQuotaSystem, 'invalid daily quota')
    this.logger.info('Proving tx.');
    await tx.prove();

    // sign with lambda
    const jsonTx = tx.toJSON()

    const { success, message, isPassedDailyQuota, signedTx } = await this.lambdaService.invokeSignTxMina({ jsonTx, dailyQuotaPerUser: addDecimal(commonConfig?.dailyQuotaPerAddress.toString(), txData.fromTokenDecimal), dailyQuotaSystem: addDecimal(commonConfig.dailyQuotaSystem.toString(), txData.fromTokenDecimal), address: txData.senderAddress, amount: txData.amountFrom })

    if (isPassedDailyQuota) {
      // break and udpate
      this.eventLogRepository.update(txData.id, { nextSendTxJobTime: getNextDayInUnix().toString() })
      throw new Error(`tx ${txData.id} passed the daily quota`)
    }
    if (!success) {
      this.logger.error(isPassedDailyQuota, message, signedTx);
      throw new Error(`tx ${txData.id} cannot get signature from lambda ${message}`)
    }
    const restoredSignedTX = Mina.Transaction.fromJSON(signedTx) // sign with lambda

    this.logger.info('send transaction...');
    // update the tx status as processing. it won't be retries

    const updateResult = await this.eventLogRepository.updateLockEvenLog(txData.id, EEventStatus.PROCESSING);
    this.logger.log('Tx status is updated=', updateResult.affected);
    const sentTx = await restoredSignedTX.send();

    this.logger.info('Transaction waiting to be applied with txhash: ', sentTx.hash);
    await sentTx?.wait({ maxAttempts: 300 });

    assert(sentTx?.hash, 'transaction failed');
    this.logger.info("Done for ", txData.id)
    return sentTx;
  }
}
