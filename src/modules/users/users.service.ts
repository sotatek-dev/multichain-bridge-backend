import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from 'database/repositories/user.repository';
import { DataSource, In, Not } from 'typeorm';

import { EError } from '@constants/error.constant';

import { httpBadRequest, httpForbidden, httpNotFound } from '@shared/exceptions/http-exeption';

import { CreateUserDto, UpdateProfileBodyDto } from './dto/user-request.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}
  async getProfile(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) httpBadRequest(EError.USER_NOT_FOUND);

    return user;
  }
}
