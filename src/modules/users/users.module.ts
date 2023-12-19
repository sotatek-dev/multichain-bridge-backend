import { Module } from '@nestjs/common';
import { UserRepository } from 'database/repositories/user.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [CustomRepositoryModule.forFeature([UserRepository, EventLogRepository])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
