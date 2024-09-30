import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'log4js';
import { DataSource } from 'typeorm';

import { ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { EError } from '../../constants/error.constant.js';
import { toPageDto } from '../../core/paginate-typeorm.js';
import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { UserRepository } from '../../database/repositories/user.repository.js';
import { TokenPair } from '../../modules/users/entities/tokenpair.entity.js';
import { httpBadRequest, httpNotFound } from '../../shared/exceptions/http-exeption.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { addDecimal } from '../../shared/utils/bignumber.js';
import { UpdateCommonConfigBodyDto } from './dto/common-config-request.dto.js';
import { GetProtocolFeeBodyDto } from './dto/user-request.dto.js';

@Injectable()
export class UsersService {
  private readonly logger: Logger;
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {
    this.logger = this.loggerService.getLogger('USER_SERVICE');
  }
  async getProfile(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) httpBadRequest(EError.USER_NOT_FOUND);

    return user;
  }

  async getHistoriesOfUser(address: string, options) {
    const [data, count] = await this.eventLogRepository.getHistoriesOfUser(address, options);
    return toPageDto(data, options, count);
  }

  async getHistories(options) {
    const [data, count] = await this.eventLogRepository.getHistories(options);
    return toPageDto(data, options, count);
  }

  async getCommonConfig() {
    return this.commonConfigRepository.getCommonConfig();
  }

  async updateCommonConfig(id: number, updateConfig: UpdateCommonConfigBodyDto) {
    return this.commonConfigRepository.updateCommonConfig(id, updateConfig);
  }

  async getDailyQuotaOfUser(address: string) {
    const [dailyQuota, totalamount] = await Promise.all([
      this.commonConfigRepository.getCommonConfig(),
      this.eventLogRepository.sumAmountBridgeOfUserInDay(address),
    ]);

    return { dailyQuota, totalAmountOfToDay: totalamount?.totalamount || 0 };
  }

  async getListTokenPair() {
    return this.dataSource.getRepository(TokenPair).find();
  }

  async getProtocolFee({ pairId }: GetProtocolFeeBodyDto) {
    let gasFee, decimal;
    const [tokenPair, configTip] = await Promise.all([
      this.dataSource.getRepository(TokenPair).findOne({
        where: { id: pairId },
      }),
      this.commonConfigRepository.getCommonConfig(),
    ]);
    if (!tokenPair) {
      httpNotFound(EError.RESOURCE_NOT_FOUND);
    }
    if (tokenPair.toChain == ENetworkName.MINA) {
      decimal = this.configService.get(EEnvKey.DECIMAL_TOKEN_EVM);
      gasFee = addDecimal(this.configService.get(EEnvKey.GAS_FEE_EVM), decimal);
    } else {
      decimal = this.configService.get(EEnvKey.DECIMAL_TOKEN_MINA);
      gasFee = addDecimal(this.configService.get(EEnvKey.GASFEEMINA), decimal);
    }

    return { gasFee, tipRate: configTip.tip, decimal };
  }
}
