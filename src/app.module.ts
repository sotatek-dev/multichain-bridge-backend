import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { RouteInfo } from '@nestjs/common/interfaces';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from 'app.controller';
import { AppService } from 'app.service';
import { ConsoleModule } from 'nestjs-console';

import { ConfigurationModule } from '@config/config.module';
import { DatabaseModule } from '@config/database.module';

import { GuardModule } from '@guards/guard.module';

import { MODULES } from '@modules/index';

import { CustomAuthorizationHeaderMiddleware } from '@shared/middleware/custom-authorization-header.middleware';
import { LoggingModule } from '@shared/modules/logger/logger.module';
import { Web3Module } from '@shared/modules/web3/web3.module';

import { LoggerHttpRequestMiddleware } from './shared/middleware/logger-http-request.middleware';

const modules = [
  ConfigurationModule,
  DatabaseModule,
  ScheduleModule.forRoot(),
  LoggingModule,
  GuardModule,
  Web3Module,
  ConsoleModule,
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
    if (process.env.NODE_ENV !== 'production') {
      consumer.apply(LoggerHttpRequestMiddleware).forRoutes('*');
    }
  }
}
