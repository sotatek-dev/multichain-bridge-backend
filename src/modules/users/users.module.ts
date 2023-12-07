import { Module } from '@nestjs/common';
import { UserRepository } from 'database/repositories/user.repository';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [CustomRepositoryModule.forFeature([UserRepository])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
