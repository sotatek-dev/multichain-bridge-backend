import Queue from 'bull';
import * as Redis from 'ioredis';

export class BullLib {
  static createNewQueue<T>(queueName: string, redisConfig: Redis.RedisOptions): Queue.Queue<T> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return new Queue(queueName, {
      redis: redisConfig,
    });
  }
}
