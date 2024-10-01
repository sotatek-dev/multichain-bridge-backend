import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { assert } from 'console';

import { ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { EQueueName, getEvmValidatorQueueName, getMinaValidatorQueueName } from '../../constants/queue.constant.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { QueueService } from '../../shared/modules/queue/queue.service.js';
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
  public addJobSignatures(eventLogId: number, network: ENetworkName) {
    return this.queueService.addJobToQueue<IJobUnlockPayload>(
      EQueueName.UNLOCK_JOB_QUEUE,
      { eventLogId, network, type: 'need_signatures' },
      {
        attempts: 5,
        backoff: 5000,
      },
    );
  }
  public addJobSendTx(eventLogId: number, network: ENetworkName) {
    return this.queueService.addJobToQueue<IJobUnlockPayload>(
      EQueueName.UNLOCK_JOB_QUEUE,
      { eventLogId, network, type: 'need_send_tx' },
      {
        attempts: 5,
        backoff: 5000,
      },
    );
  }
  public async handleJob(data: IJobUnlockPayload) {
    switch (data.type) {
      case 'need_signatures':
        return this.handleSignaturesJobs(data);
      case 'need_send_tx':
        return this.handleSendTxJobs(data);
      default:
        this.logger.error('unknown type', data);
        return;
    }
  }
  private getNumOfValidators(network: ENetworkName) {
    switch (network) {
      case ENetworkName.ETH:
        return this.configService.get(EEnvKey.EVM_VALIDATOR_THRESHHOLD);
      case ENetworkName.MINA:
        return this.configService.get(EEnvKey.MINA_VALIDATOR_THRESHHOLD);
      default:
        this.logger.warn('Unknown network!');
        throw new Error('Unknown network!');
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
    const numOfValidators = this.getNumOfValidators(data.network);

    const eventLog = await this.eventLogRepository.findOne({
      where: {
        id: data.eventLogId,
      },
      relations: {
        validator: true,
      },
    });
    assert(!!eventLog, 'not found tx with id = ' + data.eventLogId);
    this.logger.info(`Found ${eventLog.validator.length} signatures.`);
    if (eventLog.validator.length < numOfValidators) {
      this.logger.warn('not enough validators tx', data.eventLogId);
      return;
    }
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
