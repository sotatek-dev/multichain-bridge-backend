import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';
import { UserRepository } from 'database/repositories/user.repository';
import { Logger } from 'log4js';
import { DataSource } from 'typeorm';

import { initializeEthContract } from '@config/common.config';

import { ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';
import { EError } from '@constants/error.constant';
import { ASYNC_CONNECTION } from '@constants/service.constant';

import { toPageDto } from '@core/paginate-typeorm';

import { TokenPair } from '@modules/users/entities/tokenpair.entity';

import { httpBadRequest } from '@shared/exceptions/http-exeption';
import { LoggerService } from '@shared/modules/logger/logger.service';
import { ETHBridgeContract } from '@shared/modules/web3/web3.service';
import { addDecimal, calculateFee } from '@shared/utils/bignumber';

import { UpdateCommonConfigBodyDto } from './dto/common-config-request.dto';

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
    @Inject(ASYNC_CONNECTION) private readonly initializeEthContract: ETHBridgeContract,
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
    try {
      const [data, count] = await this.eventLogRepository.getHistoriesOfUser(address, options);
      return toPageDto(data, options, count);
    } catch (error) {}
  }

  async getHistories(options) {
    try {
      const [data, count] = await this.eventLogRepository.getHistories(options);
      return toPageDto(data, options, count);
    } catch (error) {}
  }

  async getCommonConfig() {
    try {
      return this.commonConfigRepository.getCommonConfig();
    } catch (error) {}
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

  async getProtocolFee(body) {
    let gasFee;
    const { pairId, amount } = body;
    const [tokenPair, configTip] = await Promise.all([
      this.dataSource.getRepository(TokenPair).findOne({
        where: { id: pairId },
      }),
      this.commonConfigRepository.getCommonConfig(),
    ]);

    if (tokenPair.toChain == ENetworkName.MINA) {
      // const rate = await this.tokenPriceRepository.getRateETHToMina();

      gasFee = addDecimal(
        this.configService.get(EEnvKey.GASFEEMINA),
        this.configService.get(EEnvKey.DECIMAL_TOKEN_MINA),
      );
    } else {
      gasFee = await this.initializeEthContract.getEstimateGas(
        tokenPair.toAddress,
        addDecimal(0, tokenPair.toDecimal),
        1,
        '0xb3Edf83eA590F44f5c400077EBd94CCFE10E4Bb0',
        0,
      );
    }

    return { amount: calculateFee(amount, gasFee, configTip.tip) };
  }
}
