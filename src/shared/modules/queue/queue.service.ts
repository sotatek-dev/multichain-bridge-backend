import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DoneCallback, Job, JobOptions, Queue } from 'bull';

import { EEnvKey } from '../../../constants/env.constant.js';
import { BullLib } from '../../../shared/utils/queue.js';
import { LoggerService } from '../logger/logger.service.js';

@Injectable()
export class QueueService {
  private queues = new Map<string, Queue>();
  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {}
  private logger = this.loggerService.getLogger('IN_QUEUE');
  private initQueueOnDemand(queueName: string): Queue {
    // reduce connection to redis
    const redisConfig = {
      host: this.configService.get(EEnvKey.REDIS_HOST),
      port: this.configService.get(EEnvKey.REDIS_PORT),
    };
    if (!this.queues.has(queueName)) {
      this.logger.info('setup Queue', queueName);
      this.queues.set(queueName, BullLib.createNewQueue(queueName, redisConfig));
    }
    return this.queues.get(queueName)!;
  }
  public async handleQueueJob<T>(queueName: string, handleFunction: CallableFunction, numOfJobs = 1) {
    const queue = this.initQueueOnDemand(queueName);
    await queue.process(numOfJobs, async (job: Job<T>, done: DoneCallback) => {
      try {
        this.logger.info('Handling job', job.data);
        await handleFunction(job.data);
        done();
      } catch (error) {
        this.logger.warn('Job failed', job.data, error);
        done(error as Error);
      }
    });
  }
  public addJobToQueue<T>(queueName: string, job: T, options: JobOptions = { attempts: 3, backoff: 5000 }) {
    const queue = this.initQueueOnDemand(queueName);
    return queue.add(job, options);
  }
}
