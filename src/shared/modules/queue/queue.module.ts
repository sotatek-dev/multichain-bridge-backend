import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { QueueService } from './queue.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
