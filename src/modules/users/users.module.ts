import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';
import { UserRepository } from 'database/repositories/user.repository';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { initializeEthContract } from '@config/common.config';

import { ASYNC_CONNECTION } from '@constants/service.constant';

import { AdminController } from './admin.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    CustomRepositoryModule.forFeature([
      UserRepository,
      EventLogRepository,
      CommonConfigRepository,
      TokenPriceRepository,
    ]),
  ],
  controllers: [UsersController, AdminController],
  providers: [
    UsersService,
    {
      provide: ASYNC_CONNECTION,
      useFactory: async (configService: ConfigService) => {
        const connection = await initializeEthContract(configService);
        return connection;
      },
      inject: [ConfigService],
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
