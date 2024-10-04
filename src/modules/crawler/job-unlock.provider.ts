import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import assert from 'assert';
import { BigNumber } from 'bignumber.js';
import { FindOptionsWhere, In, LessThan } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';

import { ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { EQueueName, getEvmValidatorQueueName, getMinaValidatorQueueName } from '../../constants/queue.constant.js';
import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { QueueService } from '../../shared/modules/queue/queue.service.js';
import { addDecimal } from '../../shared/utils/bignumber.js';
import { sleep } from '../../shared/utils/promise.js';
import { getNextDayInUnix, getTimeInFutureInMinutes } from '../../shared/utils/time.js';
import { EventLog } from './entities/event-logs.entity.js';
import { IGenerateSignature, IJobUnlockPayload, IUnlockToken } from './interfaces/job.interface.js';

@Injectable()
export class JobUnlockProvider {
  private readonly signatureJobBackOff = 5 * 1000;
  private readonly sendTxJobBackOff = 60 * 1000;
  private readonly jobRemoveDueDate = 30 * 24 * 60 * 60; // 30 days in seconds
  constructor(
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
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
          continue;
        }
        for (const tx of totalTxs) {
          if (isSignatureFullFilled) {
            await this.handleSendTxJobs(tx);
          } else {
            await this.handleSignaturesJobs(tx);
          }
        }
        await this.updateIntervalStatusForTxs(
          totalTxs.map(e => e.eventLogId),
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
    const payload: QueryDeepPartialEntity<EventLog> = {};
    const nextTime = getTimeInFutureInMinutes(60 * 5).toString();
    const query: FindOptionsWhere<EventLog> = {};
    if (isSignatureFullFilled) {
      payload.nextSendTxJobTime = nextTime;
      query.nextSendTxJobTime = LessThan(nextTime);
    } else {
      payload.nextValidateSignatureTime = nextTime;
      query.nextValidateSignatureTime = LessThan(nextTime);
    }
    return this.eventLogRepository.update({ id: In(ids), ...query }, payload);
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
          removeOnComplete: {
            age: this.jobRemoveDueDate,
          },
          backoff: this.signatureJobBackOff,
          jobId: `validate-signature-${data.eventLogId}-${i}`,
        },
      );
    }
    this.logger.info('done');
  }

  private async handleSendTxJobs(data: IJobUnlockPayload) {
    // check if there is enough threshhold -> then create an unlock job.
    if (await this.isPassDailyQuota(data.senderAddress, data.network)) {
      this.logger.warn('this tx exceed daily quota, skip until next day', data.eventLogId);
      await this.eventLogRepository.update(data.eventLogId, { nextSendTxJobTime: getNextDayInUnix().toString() });
      return;
    }
    await this.queueService.addJobToQueue<IUnlockToken>(
      this.getSenderQueueName(data.network),
      {
        eventLogId: data.eventLogId,
      },
      {
        attempts: 5,
        removeOnComplete: {
          age: this.jobRemoveDueDate,
        },
        backoff: this.sendTxJobBackOff,
        jobId: `send-tx-${data.eventLogId}`,
      },
    );
  }
  // TODO: fix this
  private async isPassDailyQuota(address: string, networkReceived: ENetworkName): Promise<boolean> {
    const fromDecimal = this.configService.get(
      networkReceived === ENetworkName.MINA ? EEnvKey.DECIMAL_TOKEN_EVM : EEnvKey.DECIMAL_TOKEN_MINA,
    );
    const [dailyQuota, todayData] = await Promise.all([
      await this.commonConfigRepository.getCommonConfig(),
      await this.eventLogRepository.sumAmountBridgeOfUserInDay(address),
    ]);
    assert(!!dailyQuota, 'daily quota undefined');
    if (
      todayData?.totalamount &&
      BigNumber(todayData.totalamount).isGreaterThan(addDecimal(dailyQuota.dailyQuota, fromDecimal))
    ) {
      return true;
    }
    return false;
  }
}
