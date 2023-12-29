import { Injectable } from '@nestjs/common';
import { UserRepository } from 'database/repositories/user.repository';

import { EError } from '@constants/error.constant';

import { httpBadRequest } from '@shared/exceptions/http-exeption';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { UpdateCommonConfigBodyDto } from './dto/common-config-request.dto';
import { DataSource } from 'typeorm';
import { TokenPair } from '@modules/users/entities/tokenpair.entity';
import { ENetworkName } from '@constants/blockchain.constant';
import { addDecimal, calculateFee } from '@shared/utils/bignumber';
import { ETHBridgeContract } from '@shared/modules/web3/web3.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly dataSource: DataSource,
    private readonly ethBridgeContract: ETHBridgeContract,

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
    
    return { dailyQuota, totalAmountOfToDay: totalamount || 0 }
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
      gasFee = addDecimal(10, 18);
    } else {
      gasFee = await this.ethBridgeContract.getEstimateGas(tokenPair.fromAddress, addDecimal(0, tokenPair.toDecimal), 1 , tokenPair.toScAddress, 0);
    }

    return {amount : calculateFee(amount, tokenPair.toDecimal , gasFee, configTip.tip)};
  }
}
