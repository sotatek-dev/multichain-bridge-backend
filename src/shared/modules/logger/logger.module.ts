import { Global, Module } from '@nestjs/common';

import { LoggerService } from './logger.service.js';

@Global()
@Module({
  imports: [],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggingModule {}
