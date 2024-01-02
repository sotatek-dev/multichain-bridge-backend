import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { DataSource } from 'typeorm';
import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { ETHBridgeContract } from '@shared/modules/web3/web3.service';
import { calculateFee } from '@shared/utils/bignumber';

@Injectable()
export class SenderEVMBridge {
  constructor(
    private readonly eventLogRepository: EventLogRepository,
    private readonly ethBridgeContract: ETHBridgeContract,
    private readonly commonConfigRepository: CommonConfigRepository,

  ) {}

  async handleUnlockEVM() {
    try {
      const [ dataLock, configTip ] = await Promise.all([
        this.eventLogRepository.getEventLockWithNetwork(ENetworkName.ETH),
        this.commonConfigRepository.getCommonConfig()
      ]) 
      const { tokenReceivedAddress, txHashLock, receiveAddress, amountFrom } = dataLock
      const gasFee = await this.ethBridgeContract.getEstimateGas(tokenReceivedAddress, BigNumber(amountFrom), txHashLock, receiveAddress, 0)
      const protocolFee = calculateFee(amountFrom, 0 , gasFee, configTip.tip)
      const result = await this.ethBridgeContract.unlock(tokenReceivedAddress, BigNumber(amountFrom), txHashLock, receiveAddress, protocolFee)

      // Update status eventLog when call function unlock
      if (result.success) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.PROCESSING);
      } else {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry + 1), EEventStatus.FAILED, result.error);
      }
    } catch (error) {

    }    
    
  }
}

