import { Module } from '@nestjs/common';
import { UserRepository } from 'database/repositories/user.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [CustomRepositoryModule.forFeature([UserRepository, EventLogRepository, CommonConfigRepository])],
  controllers: [UsersController, AdminController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
