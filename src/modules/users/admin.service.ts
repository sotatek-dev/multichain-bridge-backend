import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';

import { ENetworkName, ETokenPairStatus } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { CommonConfig } from '../crawler/entities/common-config.entity.js';
import { CreateTokenReqDto } from './dto/admin-request.dto.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}
  createNewToken(payload: CreateTokenReqDto) {
    // get erc20 metadata: decimal...
    return this.dataSource.transaction(async (e: EntityManager) => {
      const commonConfigRepo = e.getRepository(CommonConfig);
      //   move create pair logic to helpers
      const newCommonConfig = commonConfigRepo.create();
      newCommonConfig.asset = payload.assetName;
      newCommonConfig.fromAddress = payload.assetAddress;
      newCommonConfig.dailyQuota = +payload.dailyQuota;
      newCommonConfig.fromChain = ENetworkName.ETH;
      newCommonConfig.toChain = ENetworkName.MINA;
      newCommonConfig.fromDecimal = 18; // get from network
      newCommonConfig.toDecimal = 9;
      newCommonConfig.fromScAddress = this.configService.get(EEnvKey.ETH_BRIDGE_CONTRACT_ADDRESS)!;
      newCommonConfig.toScAddress = this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS)!;
      newCommonConfig.bridgeFee = payload.bridgeFee;
      newCommonConfig.mintingFee = payload.mintingFee;
      newCommonConfig.unlockingFee = payload.unlockingFee;
      newCommonConfig.status = ETokenPairStatus.CREATED;
      return newCommonConfig.save();
    });
  }
}
