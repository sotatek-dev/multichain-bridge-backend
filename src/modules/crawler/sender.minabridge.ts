import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import BigNumber from 'bignumber.js';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';
import { Logger } from 'log4js';
import { AccountUpdate, fetchAccount, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';

import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';
import { EError } from '@constants/error.constant';

import { LoggerService } from '@shared/modules/logger/logger.service';
import { addDecimal, calculateFee } from '@shared/utils/bignumber';

import { FungibleToken } from './minaSc/fungibleToken';
import { Bridge } from './minaSc/minaBridgeSC';

@Injectable()
export class SenderMinaBridge {
  private readonly logger: Logger;
  constructor(
    private readonly configService: ConfigService,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly tokenPairRepository: TokenPairRepository,
    private readonly tokenPriceRepository: TokenPriceRepository,
    private readonly loggerService: LoggerService,
  ) {
    this.logger = this.loggerService.getLogger('SENDER_MINA_BRIDGE');
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
        .dividedBy(BigNumber(10).pow(tokenPair.fromDecimal))
        .multipliedBy(BigNumber(10).pow(tokenPair.toDecimal))
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
      const feepayerKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.SIGNER_MINA_PRIVATE_KEY));
      const zkAppKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_SC_PRIVATE_KEY));
      const receiverPublicKey = PublicKey.fromBase58(receiveAddress);
      // TODO: move these urls to env
      const MINAURL = this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS);
      const ARCHIVEURL = this.configService.get(EEnvKey.MINA_BRIDGE_ARCHIVE_RPC_OPTIONS);

      const network = Mina.Network({
        mina: MINAURL,
        archive: ARCHIVEURL,
      });
      Mina.setActiveInstance(network);

      this.logger.info('compile the contract...');

      await Promise.all([Bridge.compile(), FungibleToken.compile()]);

      const fee = protocolFeeAmount * rateMINAETH + +this.configService.get(EEnvKey.BASE_MINA_BRIDGE_FEE); // in nanomina (1 billion = 1.0 mina)
      const feepayerAddress = feepayerKey.toPublicKey();
      const zkAppAddress = zkAppKey.toPublicKey();
      const zkBridge = new Bridge(zkAppAddress);

      await fetchAccount({ publicKey: zkAppAddress });
      await fetchAccount({ publicKey: feepayerAddress });

      const hasAccount = Mina.hasAccount(receiverPublicKey);
      let sentTx: Mina.PendingTransaction;
      // compile the contract to create prover keys
      try {
        // call update() and send transaction
        this.logger.info('build transaction and create proof...');
        const tx = await Mina.transaction({ sender: feepayerAddress, fee }, async () => {
          if (!hasAccount) AccountUpdate.fundNewAccount(feepayerAddress);
          await zkBridge.unlock(UInt64.from(amount), receiverPublicKey, UInt64.from(txId));
        });
        await tx.prove();
        this.logger.info('send transaction...');
        sentTx = await tx.sign([feepayerKey, zkAppKey]).send();
      } catch (err) {
        this.logger.error(err);
      }
      this.logger.info('Transaction waiting to be applied with txhash: ', sentTx?.hash);
      await sentTx?.wait({ maxAttempts: 300 });
      if (sentTx.hash) {
        return { success: true, error: null, data: sentTx.hash };
      } else {
        return { success: false, error: sentTx, data: null };
      }
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
}
