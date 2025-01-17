import { Global, Module } from '@nestjs/common';

import { RedisClientService } from './redis-client.service.js';

@Global()
@Module({
  providers: [RedisClientService],
  exports: [RedisClientService],
})
export class RedisModule {}
