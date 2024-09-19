import { Module } from '@nestjs/common';
import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { TokenPriceRepository } from '../../database/repositories/token-price.repository.js';
import { UserRepository } from '../../database/repositories/user.repository.js';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { AdminController } from './admin.controller.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

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
