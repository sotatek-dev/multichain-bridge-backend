import Queue from 'bull';
import * as Redis from 'ioredis';

export class BullLib {
  static createNewQueue(queueName: string, redisConfig: Redis.RedisOptions): Queue.Queue<any> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return new Queue(queueName, {
      redis: redisConfig,
    });
  }
}
