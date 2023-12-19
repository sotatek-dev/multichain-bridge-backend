import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { DataSource } from 'typeorm';
import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { ETHBridgeContract } from '@shared/modules/web3/web3.service';

@Injectable()
export class SenderEVMBridge {
  constructor(
    private readonly eventLogRepository: EventLogRepository,
    private readonly ethBridgeContract: ETHBridgeContract,

  ) {}

  async handleUnlockEVM() {
    try {
      const dataLock = await this.eventLogRepository.getEventLockWithNetwork(ENetworkName.ETH);
      const { tokenReceivedAddress, txHashLock, receiveAddress, amountFrom } = dataLock

      const result = await this.ethBridgeContract.unlock(tokenReceivedAddress, BigNumber(amountFrom), txHashLock, receiveAddress)

      // Update status eventLog when call function unlock
      if (result.success) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.DONE);
      } else {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry + 1), EEventStatus.FAILED);
      }

    } catch (error) {
      
    }    
    
  }
}

