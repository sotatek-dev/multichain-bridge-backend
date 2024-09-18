import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import assert from 'assert';
import BigNumber from 'bignumber.js';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { MultiSignatureRepository } from 'database/repositories/multi-signature.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';
import { Logger } from 'log4js';
import { AccountUpdate, fetchAccount, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';

import { DECIMAL_BASE, EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';
import { EError } from '@constants/error.constant';

import { LoggerService } from '@shared/modules/logger/logger.service';
import { addDecimal, calculateFee } from '@shared/utils/bignumber';

import { MultiSignature } from './entities/multi-signature.entity';
import { Bridge } from './minaSc/Bridge.js';
import { Bytes256, Ecdsa, Secp256k1 } from './minaSc/ecdsa.js';
import { FungibleToken } from './minaSc/FungibleToken.js';
import { FungibleTokenAdmin } from './minaSc/FungibleTokenAdmin.js';

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
    private readonly tokenPriceRepository: TokenPriceRepository,
    private readonly multiSignatureRepository: MultiSignatureRepository,
    private readonly loggerService: LoggerService,
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

  private async compileContract() {
    if (!this.isContractCompiled) {
      await FungibleToken.compile();
      await FungibleTokenAdmin.compile();
      await Bridge.compile();
      // await Manager.compile();
      // await ValidatorManager.compile();
      this.isContractCompiled = true;
    }
  }
  public async handleUnlockMina() {
    let dataLock, configTip, rateethmina;
    try {
      [dataLock, configTip, { rateethmina }] = await Promise.all([
        this.eventLogRepository.getEventLockWithNetwork(ENetworkName.MINA),
        this.commonConfigRepository.getCommonConfig(),
        this.tokenPriceRepository.getRateETHToMina(),
      ]);
      if (!dataLock) {
        return;
      }
      await this.eventLogRepository.updateLockEvenLog(dataLock.id, EEventStatus.PROCESSING);

      const { tokenReceivedAddress, tokenFromAddress, id, receiveAddress, amountFrom, senderAddress } = dataLock;
      const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);

      if (!tokenPair) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(
          dataLock.id,
          dataLock.retry,
          EEventStatus.NOTOKENPAIR,
        );
        return;
      }

      const amountReceiveConvert = BigNumber(amountFrom)
        .dividedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.fromDecimal))
        .multipliedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.toDecimal))
        .toString();
      const protocolFeeAmount = calculateFee(
        amountReceiveConvert,
        addDecimal(this.configService.get(EEnvKey.GASFEEMINA), this.configService.get(EEnvKey.DECIMAL_TOKEN_MINA)),
        configTip.tip,
      );
      const amountReceive = BigNumber(amountReceiveConvert).minus(protocolFeeAmount).toString();
      const isPassDailyQuota = await this.isPassDailyQuota(senderAddress, tokenPair.fromDecimal);
      if (!isPassDailyQuota) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(
          dataLock.id,
          dataLock.retry,
          EEventStatus.FAILED,
          EError.OVER_DAILY_QUOTA,
        );
        return;
      }

      const rateMINAETH = Number(rateethmina.toFixed(0)) || 2000;
      const result = await this.callUnlockFunction(amountReceive, id, receiveAddress, protocolFeeAmount, rateMINAETH);
      // Update status eventLog when call function unlock
      if (result.success) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(
          dataLock.id,
          dataLock.retry,
          EEventStatus.PROCESSING,
          result.error,
          result.data,
          protocolFeeAmount,
        );
      } else {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(
          dataLock.id,
          Number(dataLock.retry + 1),
          EEventStatus.FAILED,
          result.error,
        );
      }
      return result;
    } catch (error) {
      await this.eventLogRepository.updateStatusAndRetryEvenLog(
        dataLock.id,
        Number(dataLock.retry + 1),
        EEventStatus.FAILED,
        error,
      );
    }
  }

  private async callUnlockFunction(amount, txId, receiveAddress, protocolFeeAmount, rateMINAETH) {
    try {
      this.logger.info('compile the contract...');
      await this.compileContract();

      const fee = protocolFeeAmount * rateMINAETH + +this.configService.get(EEnvKey.BASE_MINA_BRIDGE_FEE); // in nanomina (1 billion = 1.0 mina)
      const feePayerPublicKey = this.feePayerKey.toPublicKey();
      const bridgePublicKey = this.bridgeKey.toPublicKey();
      const receiverPublicKey = PublicKey.fromBase58(receiveAddress);

      const zkBridge = new Bridge(bridgePublicKey);

      console.log(bridgePublicKey.toBase58(), feePayerPublicKey.toBase58(), this.tokenPublicKey.toBase58());

      await Promise.all([
        fetchAccount({ publicKey: bridgePublicKey }),
        fetchAccount({ publicKey: feePayerPublicKey }),
        fetchAccount({ publicKey: receiverPublicKey }),
        fetchAccount({ publicKey: this.tokenPublicKey }),
      ]);

      const hasAccount = Mina.hasAccount(receiverPublicKey);
      // compile the contract to create prover keys
      // call update() and send transaction
      const privateKey = Secp256k1.Scalar.from('123456789012345678901234567890123456787');
      const publicKey = Secp256k1.generator.scale(privateKey);

      const typedAmount = UInt64.from(amount);

      const msg = Bytes256.fromString(
        `unlock receiver = ${receiverPublicKey.toFields} amount = ${typedAmount.toFields} tokenAddr = ${this.tokenPublicKey.toFields}`,
      );

      const signature = Ecdsa.sign(msg.toBytes(), privateKey.toBigInt());

      this.logger.info('build transaction and create proof...');
      const tx = await Mina.transaction({ sender: feePayerPublicKey, fee }, async () => {
        if (!hasAccount) AccountUpdate.fundNewAccount(feePayerPublicKey);
        await zkBridge.unlock(
          typedAmount,
          receiverPublicKey,
          UInt64.from(txId),
          this.tokenPublicKey,
          signature,
          publicKey,
          signature,
          publicKey,
          signature,
          publicKey,
          signature,
          publicKey,
          signature,
          publicKey,
        );
      });

      await tx.prove();
      console.log('send transaction...');
      const sentTx = await tx.sign([this.feePayerKey, this.bridgeKey]).send();

      this.logger.info('Transaction waiting to be applied with txhash: ', sentTx);
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
    let dataLock;
    const signerPrivateKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.SIGNER_MINA_PRIVATE_KEY));
    const signerPublicKey = PublicKey.fromPrivateKey(signerPrivateKey);
    try {
      [dataLock] = await Promise.all([
        this.eventLogRepository.getValidatorPendingSignature(signerPublicKey.toBase58(), ENetworkName.MINA),
        this.commonConfigRepository.getCommonConfig(),
      ]);

      if (!dataLock) {
        return;
      }

      const { tokenReceivedAddress, tokenFromAddress, receiveAddress, amountFrom } = dataLock;

      const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);

      if (!tokenPair) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(
          dataLock.id,
          dataLock.retry,
          EEventStatus.NOTOKENPAIR,
        );
        return;
      }
      const receiverPublicKey = PublicKey.fromBase58(receiveAddress);
      const tokenPublicKey = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS));

      const amountReceive = BigNumber(amountFrom)
        .dividedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.fromDecimal))
        .multipliedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.toDecimal))
        .toString();

      const msg = Bytes256.fromString(
        `unlock receiver = ${receiverPublicKey.toFields} amount = ${UInt64.from(amountReceive).toFields} tokenAddr = ${tokenPublicKey.toFields}`,
      );

      const signature = Ecdsa.sign(msg.toBytes(), signerPrivateKey.toBigInt());

      await this.multiSignatureRepository.save(
        new MultiSignature({
          chain: ENetworkName.MINA,
          signature: JSON.stringify(signature.toBigInt()),
          validator: signerPublicKey.toBase58(),
          txId: dataLock.id,
        }),
      );
    } catch (error) {
      this.logger.log(EError.INVALID_SIGNATURE, error);
      await this.multiSignatureRepository.upsertErrorAndRetryMultiSignature(
        signerPublicKey.toBase58(),
        dataLock.id,
        error,
      );
    }
  }
}
