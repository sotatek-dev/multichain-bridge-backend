import { Module } from '@nestjs/common';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';
import { UserRepository } from 'database/repositories/user.repository';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

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
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
