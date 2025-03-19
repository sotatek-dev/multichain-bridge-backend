import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConsoleModule } from 'nestjs-console';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigurationModule } from './config/config.module.js';
import { DatabaseModule } from './config/database.module.js';
import { GuardModule } from './guards/guard.module.js';
import { MODULES } from './modules/index.js';
import { CustomAuthorizationHeaderMiddleware } from './shared/middleware/custom-authorization-header.middleware.js';
import { LoggerHttpRequestMiddleware } from './shared/middleware/logger-http-request.middleware.js';
import { LoggingModule } from './shared/modules/logger/logger.module.js';
import { QueueModule } from './shared/modules/queue/queue.module.js';
import { RedisModule } from './shared/modules/redis/redis.module.js';
import { Web3Module } from './shared/modules/web3/web3.module.js';
import { isDevelopmentEnvironment } from './shared/utils/util.js';
import { AwsModule } from './shared/modules/aws/aws.module.js';
import { ZkWorkderModule } from './shared/modules/zkworker/zkworker.module.js';
import { RouteInfo } from '@nestjs/common/interfaces/index.js';

const modules = [
  ConfigurationModule,
  DatabaseModule,
  ScheduleModule.forRoot(),
  LoggingModule,
  RedisModule,
  GuardModule,
  Web3Module,
  AwsModule,
  QueueModule,
  ConsoleModule,
  ZkWorkderModule,
  ...MODULES,
];
@Module({
  imports: modules,
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    const thirdPartyLoginRoutes: RouteInfo[] = [
      {
        path: '/auth/login/ms',
        method: RequestMethod.POST,
      },
    ];
    consumer.apply(CustomAuthorizationHeaderMiddleware).forRoutes(...thirdPartyLoginRoutes);
    if (isDevelopmentEnvironment()) {
      consumer.apply(LoggerHttpRequestMiddleware).forRoutes('*');
    }
  }
}
