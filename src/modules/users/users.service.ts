import { Injectable } from '@nestjs/common';
import { UserRepository } from 'database/repositories/user.repository';

import { EError } from '@constants/error.constant';

import { httpBadRequest } from '@shared/exceptions/http-exeption';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { UpdateCommonConfigBodyDto } from './dto/common-config-request.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository
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

  async getCommonConfig() {
    try {
      return this.commonConfigRepository.getCommonConfig()
    } catch (error) {
      
    }
  }

  async updateCommonConfig(id: number, updateConfig: UpdateCommonConfigBodyDto) {
    try {      
      return this.commonConfigRepository.updateCommonConfig(id, updateConfig)
    } catch (error) {
      console.log(error);
    }
  }
}
