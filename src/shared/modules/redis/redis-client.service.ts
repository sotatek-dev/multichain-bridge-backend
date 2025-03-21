import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

import { ENetworkName } from '../../../constants/blockchain.constant.js';
import { EEnvKey } from '../../../constants/env.constant.js';
import { getSecondsUntilMidNight } from '../../../shared/utils/time.js';

@Injectable()
export class RedisClientService implements OnModuleInit, OnModuleDestroy {
  public client: RedisClientType;
  constructor(private readonly configService: ConfigService) {
    this.client = createClient({
      url: `redis://${configService.get(EEnvKey.REDIS_HOST)}:${configService.get(EEnvKey.REDIS_PORT)}`,
    });
  }
  async onModuleInit() {
    await this.client.connect();
  }
  async onModuleDestroy() {
    await this.client.disconnect();
  }
  // noti
  //   public async getCurrentNotificationCount(address: string): Promise<number> {
  //     const res = await this.client.get(`not_count_${address}`);
  //     return Number(res).valueOf();
  //   }
  //   public async incrNotificationCount(address: string): Promise<number> {
  //     return this.client.incr(`not_count_${address}`);
  //   }

  //   public async resetNotificationCount(address: string) {
  //     return this.client.set(`not_count_${address}`, 0);
  //   }
  // estimate bridge time
  async getCountWaitingTx(network: ENetworkName): Promise<number> {
    const res = await this.client.get(`waiting_tx_${network}`);
    return Number(res).valueOf();
  }
  public async setCountWaitingTx(network: ENetworkName, initValue: number, expireTime: number) {
    return this.client.set(`waiting_tx_${network}`, initValue, {
      EX: expireTime,
    });
  }
  public async incrCountWaitingTx(network: ENetworkName): Promise<number> {
    return this.client.incr(`waiting_tx_${network}`);
  }

  public async decrCountWaitingTx(network: ENetworkName) {
    return this.client.eval(`
        local key='waiting_tx_${network}'
        local current_value = tonumber(redis.call('GET', key) or 0)
        if current_value == 0 then
            return current_value
        else
            -- Decrement the value by 1
            local new_value = current_value - 1
            redis.call('SET', key, new_value)
            return new_value
        end
        `);
  }
  // daily quota
  public updateDailyQuota(address: string, token: string, network: ENetworkName, amountWithDecimal: string) {
    const ttl: number = getSecondsUntilMidNight();
    return this.client.eval(`
      local user_quota='user_quota_${network}_${token}_${address}'
      local system_quota='system_quota_${network}_${token}'

      local current_user_quota = tonumber(redis.call('GET', user_quota) or 0)
      local current_system_quota = tonumber(redis.call('GET', system_quota) or 0)
        
      local new_user_quota = current_user_quota + ${amountWithDecimal}
      local new_system_quota = current_system_quota + ${amountWithDecimal}

      redis.call('SET', user_quota, new_user_quota)
      redis.call('SET', system_quota, new_system_quota)

      redis.call('EXPIRE', user_quota, ${ttl})
      redis.call('EXPIRE', system_quota, ${ttl})
      return ${ttl}
      `);
  }
  public getDailyQuota(address: string, token: string, network: ENetworkName) {

    const userQuota = `user_quota_${network}_${token}_${address}`
    const systemQuota = `system_quota_${network}_${token}`

    return Promise.all([this.client.get(userQuota), this.client.get(systemQuota)])
  }
}
