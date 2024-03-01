import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EError } from '@constants/error.constant';
import { ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';

import { addDecimal, calculateFee } from '@shared/utils/bignumber';
import { ETHBridgeContract } from '@shared/modules/web3/web3.service';
import { httpBadRequest } from '@shared/exceptions/http-exeption';

import { UserRepository } from 'database/repositories/user.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';

import { UpdateCommonConfigBodyDto } from './dto/common-config-request.dto';
import { DataSource } from 'typeorm';
import { TokenPair } from '@modules/users/entities/tokenpair.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly tokenPriceRepository: TokenPriceRepository,
    private readonly dataSource: DataSource,
    private readonly ethBridgeContract: ETHBridgeContract,
    private readonly configService: ConfigService,

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

  async getDailyQuotaOfUser(address: string) {
    const [dailyQuota , totalamount] = await Promise.all([
      this.commonConfigRepository.getCommonConfig(),
      this.eventLogRepository.sumAmountBridgeOfUserInDay(address)
    ])
    
    return { dailyQuota, totalAmountOfToDay: totalamount?.totalamount || 0 }
  }

  async getListTokenPair() {
    return this.dataSource.getRepository(TokenPair).find();
  }

  async getProtocolFee(body) {
    let gasFee;
    const { pairId, amount } = body;
    const [tokenPair, configTip] = await Promise.all([
      this.dataSource.getRepository(TokenPair).findOne({
        where: { id : pairId}
      }),
      this.commonConfigRepository.getCommonConfig()
    ])

    if(tokenPair.toChain == ENetworkName.MINA) {
      const rate = await this.tokenPriceRepository.getRateETHToMina()

      gasFee = addDecimal(this.configService.get(EEnvKey.GASFEEMINA), this.configService.get(EEnvKey.DECIMAL_TOKEN_MINA));
    } else {
      gasFee = await this.ethBridgeContract.getEstimateGas(tokenPair.toAddress, addDecimal(0, tokenPair.toDecimal), 1 , '0xb3Edf83eA590F44f5c400077EBd94CCFE10E4Bb0', 0);
    }

    return {amount : calculateFee(amount, gasFee, configTip.tip)};
  }
}
