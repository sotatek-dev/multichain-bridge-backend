import Queue from 'bull';
import * as Redis from 'ioredis';

export class BullLib {
  static createNewQueue<T>(queueName: string, redisConfig: Redis.RedisOptions): Queue.Queue<T> {
    const defaultLockTime = 1 * 60 * 60 * 1000;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return new Queue(queueName, {
      redis: redisConfig,
      settings: {
        lockDuration: defaultLockTime, // lock the job for one hours.
        lockRenewTime: Math.floor(defaultLockTime / 2),
        maxStalledCount: 0,
      },
    });
  }
}
