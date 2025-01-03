import { Module } from '@nestjs/common';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { TokenPairRepository } from '../../database/repositories/token-pair.repository.js';
import { TokenPriceRepository } from '../../database/repositories/token-price.repository.js';
import { UserRepository } from '../../database/repositories/user.repository.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    CustomRepositoryModule.forFeature([
      UserRepository,
      EventLogRepository,
      CommonConfigRepository,
      TokenPriceRepository,
      TokenPairRepository,
    ]),
  ],
  controllers: [UsersController, AdminController],
  providers: [UsersService, AdminService],
  exports: [UsersService],
})
export class UsersModule {}
