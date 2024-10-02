import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { In } from 'typeorm';

import { ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { EQueueName, getEvmValidatorQueueName, getMinaValidatorQueueName } from '../../constants/queue.constant.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { QueueService } from '../../shared/modules/queue/queue.service.js';
import { sleep } from '../../shared/utils/promise.js';
import { getTimeInFutureInSeconds } from '../../shared/utils/time.js';
import { EventLog } from './entities/event-logs.entity.js';
import { IGenerateSignature, IJobUnlockPayload, IUnlockToken } from './interfaces/job.interface.js';

@Injectable()
export class JobUnlockProvider {
  constructor(
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
    private readonly eventLogRepository: EventLogRepository,
  ) {}
  private logger = this.loggerService.getLogger('JOB_UNLOCK_PROVIDER');

  public async handleJob() {
    await Promise.all([this.getPendingTx(true), this.getPendingTx(false)]);
  }

  private async getPendingTx(isSignatureFullFilled: boolean) {
    while (true) {
      try {
        const [pendingSignaturesMinaTx, pendingSignaturesEthTx] = await Promise.all([
          this.eventLogRepository.getPendingTx(
            ENetworkName.MINA,
            isSignatureFullFilled,
            this.getNumOfValidators(ENetworkName.MINA),
          ),
          this.eventLogRepository.getPendingTx(
            ENetworkName.ETH,
            isSignatureFullFilled,
            this.getNumOfValidators(ENetworkName.ETH),
          ),
        ]);
        const totalTxs = [...pendingSignaturesEthTx, ...pendingSignaturesMinaTx];
        if (totalTxs.length > 0) {
          this.logger.info(
            `${isSignatureFullFilled ? 'Sending tx' : 'Validating signature'} for ${totalTxs.length}, mina count ${pendingSignaturesMinaTx.length}, eth count ${pendingSignaturesEthTx.length}`,
          );
        } else {
          this.logger.info('no pending tx');
          return;
        }
        for (const tx of totalTxs) {
          if (isSignatureFullFilled) {
            await this.handleSendTxJobs({ eventLogId: tx.id, network: tx.networkReceived });
          } else {
            await this.handleSignaturesJobs({ eventLogId: tx.id, network: tx.networkReceived });
          }
        }
        await this.updateIntervalStatusForTxs(
          totalTxs.map(e => e.id),
          isSignatureFullFilled,
        );
        // update interval status of tx
      } catch (error) {
        this.logger.error(error);
      } finally {
        await sleep(5);
      }
    }
  }
  // helpers
  private updateIntervalStatusForTxs(ids: number[], isSignatureFullFilled: boolean) {
    const payload: Partial<EventLog> = {};
    if (isSignatureFullFilled) {
      payload.nextSendTxJobTime = getTimeInFutureInSeconds(10).toString();
    } else {
      payload.nextValidateSignatureTime = getTimeInFutureInSeconds(10).toString();
    }
    return this.eventLogRepository.update({ id: In(ids) }, payload);
  }
  private getNumOfValidators(network: ENetworkName) {
    switch (network) {
      case ENetworkName.ETH:
        return this.configService.get(EEnvKey.EVM_VALIDATOR_THRESHHOLD);
      case ENetworkName.MINA:
        return this.configService.get(EEnvKey.MINA_VALIDATOR_THRESHHOLD);
      default:
        this.logger.warn('Unknown network!', network);
        throw new Error('Unknown network!' + network);
    }
  }
  private getSenderQueueName(network: ENetworkName) {
    switch (network) {
      case ENetworkName.ETH:
        return EQueueName.EVM_SENDER_QUEUE;
      case ENetworkName.MINA:
        return EQueueName.MINA_SENDER_QUEUE;
      default:
        this.logger.warn('Unknown network!');
        throw new Error('Unknown network!');
    }
  }
  private getValidatorQueueName(network: ENetworkName, index: number) {
    switch (network) {
      case ENetworkName.ETH:
        return getEvmValidatorQueueName(index);
      case ENetworkName.MINA:
        return getMinaValidatorQueueName(index);
      default:
        this.logger.warn('Unknown network!');
        throw new Error('Unknown network!');
    }
  }
  private async handleSignaturesJobs(data: IJobUnlockPayload) {
    // create a job for every validators in a network.
    this.logger.info(`Handling create validator jobs for tx ${data.eventLogId},network ${data.network}`);
    for (let i = 1; i <= this.getNumOfValidators(data.network); i++) {
      await this.queueService.addJobToQueue<IGenerateSignature>(
        this.getValidatorQueueName(data.network, i),
        {
          eventLogId: data.eventLogId,
        },
        {
          attempts: 5,
          backoff: 5000,
          jobId: `validate-signature-${data.eventLogId}-${i}`,
        },
      );
    }
    this.logger.info('done');
  }

  private async handleSendTxJobs(data: IJobUnlockPayload) {
    // check if there is enough threshhold -> then create an unlock job.
    await this.queueService.addJobToQueue<IUnlockToken>(
      this.getSenderQueueName(data.network),
      {
        eventLogId: data.eventLogId,
      },
      {
        attempts: 5,
        backoff: 5000,
        jobId: `send-tx-${data.eventLogId}`,
      },
    );
  }
}
