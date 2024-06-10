import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';

import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EError } from '@constants/error.constant';

import { ETHBridgeContract } from '@shared/modules/web3/web3.service';
import { addDecimal, calculateFee } from '@shared/utils/bignumber';

@Injectable()
export class SenderEVMBridge {
  constructor(
    private readonly eventLogRepository: EventLogRepository,
    private readonly ethBridgeContract: ETHBridgeContract,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly tokenPairRepository: TokenPairRepository,
  ) {}

  async handleUnlockEVM() {
    let dataLock, configTip;
    try {
      [dataLock, configTip] = await Promise.all([
        this.eventLogRepository.getEventLockWithNetwork(ENetworkName.ETH),
        this.commonConfigRepository.getCommonConfig(),
      ]);

      if (!dataLock) {
        return;
      }
      await this.eventLogRepository.updateLockEvenLog(dataLock.id, EEventStatus.PROCESSING);

      const { tokenReceivedAddress, tokenFromAddress, txHashLock, receiveAddress, senderAddress, amountFrom } =
        dataLock;

      const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);
      if (!tokenPair) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(
          dataLock.id,
          dataLock.retry,
          EEventStatus.NOTOKENPAIR,
        );
        return;
      }

      const amountReceive = BigNumber(amountFrom)
        .dividedBy(BigNumber(10).pow(tokenPair.fromDecimal))
        .multipliedBy(BigNumber(10).pow(tokenPair.toDecimal))
        .toString();

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

      const gasFee = await this.ethBridgeContract.getEstimateGas(
        tokenReceivedAddress,
        BigNumber(amountReceive),
        txHashLock,
        receiveAddress,
        0,
      );
      const protocolFee = calculateFee(amountReceive, gasFee, configTip.tip);
      const result = await this.ethBridgeContract.unlock(
        tokenReceivedAddress,
        BigNumber(amountReceive),
        txHashLock,
        receiveAddress,
        BigNumber(protocolFee),
      );

      // Update status eventLog when call function unlock
      if (result.success) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.PROCESSING);
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

  private async isPassDailyQuota(address: string, fromDecimal: number): Promise<boolean> {
    const [dailyQuota, totalamount] = await Promise.all([
      await this.commonConfigRepository.getCommonConfig(),
      await this.eventLogRepository.sumAmountBridgeOfUserInDay(address),
    ]);

    if (
      totalamount &&
      BigNumber(totalamount.totalamount).isGreaterThan(addDecimal(dailyQuota.dailyQuota, fromDecimal))
    ) {
      return false;
    }
    return true;
  }
}
