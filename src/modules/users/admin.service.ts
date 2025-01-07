import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import assert from 'assert';
import { isNotEmpty, isNumber } from 'class-validator';
import { DataSource, EntityManager } from 'typeorm';

import { ENetworkName, ETokenPairStatus } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { EError } from '../../constants/error.constant.js';
import { toPageDto } from '../../core/paginate-typeorm.js';
import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { TokenDeployer } from '../../modules/crawler/deploy-token.js';
import { httpBadRequest } from '../../shared/exceptions/http-exeption.js';
import { Erc20ContractTemplate } from '../../shared/modules/web3/web3.service.js';
import { CommonConfig } from '../crawler/entities/common-config.entity.js';
import { CreateTokenReqDto } from './dto/admin-request.dto.js';
import { GetTokensReqDto } from './dto/user-request.dto.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly commonConfigRepo: CommonConfigRepository,
    private readonly tokenDeployerService: TokenDeployer,
    private readonly erc20ContractTemplate: Erc20ContractTemplate,
  ) {}
  async createNewToken(payload: CreateTokenReqDto) {
    if (await this.checkTokenExist(payload.assetAddress)) {
      return httpBadRequest(EError.DUPLICATED_ACTION);
    }
    const [symbol, decimals] = await Promise.all([
      this.erc20ContractTemplate.getTokenSymbol(payload.assetAddress),
      this.erc20ContractTemplate.getTokenDecimals(payload.assetAddress).then(res => +res),
    ]);
    assert(isNotEmpty(symbol), 'symbol invalid');
    assert(isNumber(decimals) && decimals > 0, 'decimals invalid');
    const newTokenPair = await this.dataSource.transaction(async (e: EntityManager) => {
      const commonConfigRepo = e.getRepository(CommonConfig);
      //   move create pair logic to helpers
      const newCommonConfig = commonConfigRepo.create();
      newCommonConfig.asset = symbol;
      newCommonConfig.fromAddress = payload.assetAddress;
      newCommonConfig.dailyQuota = +payload.dailyQuota;
      newCommonConfig.fromChain = ENetworkName.ETH;
      newCommonConfig.toChain = ENetworkName.MINA;
      newCommonConfig.fromDecimal = decimals; // get from network
      newCommonConfig.toDecimal = 9;
      newCommonConfig.fromScAddress = this.configService.get(EEnvKey.ETH_BRIDGE_CONTRACT_ADDRESS)!;
      newCommonConfig.toScAddress = this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS)!;
      newCommonConfig.bridgeFee = payload.bridgeFee;
      newCommonConfig.mintingFee = payload.mintingFee;
      newCommonConfig.unlockingFee = payload.unlockingFee;
      newCommonConfig.status = ETokenPairStatus.CREATED;
      newCommonConfig.isHidden = true;
      return newCommonConfig.save();
    });
    assert(isNumber(newTokenPair.id), 'Token pair invalid!');
    await this.tokenDeployerService.addJobDeployTokenMina(newTokenPair.id);
    return newTokenPair;
  }
  async checkTokenExist(fromAddress: string) {
    const isExist = await this.commonConfigRepo.findOneBy({ fromAddress });
    return !!isExist;
  }
  async getListToken(payload: GetTokensReqDto) {
    const [tokens, count] = await this.commonConfigRepo.getManyAndPagination(payload);
    return toPageDto(tokens, payload, count);
  }
  async redeployToken(tokenPairId: number) {
    const tokenInfo = await this.commonConfigRepo.findOneBy({ id: tokenPairId });
    if (!tokenInfo) {
      httpBadRequest(EError.RESOURCE_NOT_FOUND);
    }
    if (tokenInfo.status !== ETokenPairStatus.DEPLOY_FAILED) {
      return httpBadRequest(EError.ACTION_CANNOT_PROCESSED);
    }

    await this.tokenDeployerService.deployTokenMina(tokenInfo.id);
  }
}
