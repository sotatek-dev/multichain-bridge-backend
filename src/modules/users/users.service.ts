import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from 'database/repositories/user.repository';
import { DataSource, In, Not } from 'typeorm';

import { EError } from '@constants/error.constant';

import { httpBadRequest, httpForbidden, httpNotFound } from '@shared/exceptions/http-exeption';
import { EventLogRepository } from 'database/repositories/event-log.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private dataSource: DataSource,
    private configService: ConfigService,
    private readonly eventLogRepository: EventLogRepository,
  ) {}
  async getProfile(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) httpBadRequest(EError.USER_NOT_FOUND);

    return user;
  }

  async getHistoriesOfUser(address: string, options ) {
    try {
      const [data, count] = await this.eventLogRepository.getHistoriesOfUser(address, options)
      return data.toPageDto(options, count);
    } catch (error) {
      
    }
  }

  async getHistories(options ) {
    try {
      const [data, count] = await this.eventLogRepository.getHistories(options)
      return data.toPageDto(options, count);
    } catch (error) {
      
    }
  }
}
