import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import assert from 'assert';
import { BigNumber } from 'bignumber.js';
import web3Utils from 'web3-utils';
import { EAsset } from '../../constants/api.constant.js';
import { DECIMAL_BASE, ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { EError } from '../../constants/error.constant.js';
import { toPageDto } from '../../core/paginate-typeorm.js';
import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { TokenPairRepository } from '../../database/repositories/token-pair.repository.js';
import { TokenPriceRepository } from '../../database/repositories/token-price.repository.js';
import { UserRepository } from '../../database/repositories/user.repository.js';
import { httpBadRequest, httpNotFound } from '../../shared/exceptions/http-exeption.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { RedisClientService } from '../../shared/modules/redis/redis-client.service.js';
import { addDecimal } from '../../shared/utils/bignumber.js';
import { UpdateCommonConfigBodyDto } from './dto/common-config-request.dto.js';
import { GetHistoryDto, GetHistoryOfUserDto } from './dto/history-response.dto.js';
import { GetProtocolFeeBodyDto } from './dto/user-request.dto.js';
import { GetProofOfAssetsResponseDto, GetTokensPriceResponseDto } from './dto/user-response.dto.js';
const { toChecksumAddress } = web3Utils
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
    private readonly tokenPriceRepository: TokenPriceRepository,
    private readonly tokenPairRepostitory: TokenPairRepository,
    private readonly redisClientService: RedisClientService,
  ) { }
  private readonly logger = this.loggerService.getLogger('USER_SERVICE');
  async getProfile(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) httpBadRequest(EError.USER_NOT_FOUND);

    return user;
  }

  async getHistoriesOfUser(address: string, options: GetHistoryOfUserDto) {
    const [data, count] = await this.eventLogRepository.getHistoriesOfUser(address, options);
    return toPageDto(data, options, count);
  }

  async getHistories(options: GetHistoryDto) {
    const [data, count] = await this.eventLogRepository.getHistories(options);
    return toPageDto(data, options, count);
  }

  async getCommonConfig() {
    return this.commonConfigRepository.getCommonConfig();
  }

  async updateCommonConfig(id: number, updateConfig: UpdateCommonConfigBodyDto) {
    await this.commonConfigRepository.updateCommonConfig(id, updateConfig);
    return updateConfig;
  }

  async getDailyQuotaOfUser(address: string, network: ENetworkName, token: string) {
    const [config, quota] = await Promise.all([
      this.commonConfigRepository.getCommonConfig(),
      this.redisClientService.getDailyQuota(network === ENetworkName.ETH ? toChecksumAddress(address) : address, token, network),
    ]);

    assert(config, 'invalid config')

    const { dailyQuotaPerAddress, dailyQuotaSystem } = config;

    const [curUserQuota, curSystemQuota] = quota;

    return { dailyQuotaPerAddress, dailyQuotaSystem, curUserQuota: BigNumber.min(curUserQuota ?? 0, dailyQuotaPerAddress), curSystemQuota: BigNumber.min(curSystemQuota ?? 0, dailyQuotaSystem) };
  }

  async getListTokenPair() {
    return this.tokenPairRepostitory.find();
  }

  async getProtocolFee({ pairId }: GetProtocolFeeBodyDto) {
    let gasFee, decimal;
    const [tokenPair, config] = await Promise.all([
      this.tokenPairRepostitory.findOneBy({
        id: pairId,
      }),
      this.commonConfigRepository.getCommonConfig(),
    ]);
    if (!tokenPair) {
      httpNotFound(EError.RESOURCE_NOT_FOUND);
    }
    assert(config, 'system common config not found!');
    if (tokenPair!.toChain == ENetworkName.MINA) {
      decimal = this.configService.get(EEnvKey.DECIMAL_TOKEN_MINA);
      gasFee = addDecimal(config.feeUnlockMina, decimal);
    } else {
      decimal = this.configService.get(EEnvKey.DECIMAL_TOKEN_EVM);
      gasFee = addDecimal(config.feeUnlockEth, decimal);
    }

    return { gasFee, tipRate: config.tip, decimal };
  }
  async getTokensPrices(): Promise<GetTokensPriceResponseDto> {
    const result = {
      ethPriceInUsd: '0',
      minaPriceInUsd: '0',
      ethPriceUpdatedAt: new Date(0),
      minaPriceUpdatedAt: new Date(0),
    };
    const tokenPrices = await this.tokenPriceRepository.createQueryBuilder().distinctOn(['symbol']).take(2).getMany();

    assert(tokenPrices.length >= 2, 'token price data is invalid');

    tokenPrices.forEach(e => {
      if (e.symbol === EAsset.ETH) {
        result.ethPriceInUsd = e.priceUsd;
        result.ethPriceUpdatedAt = e.updatedAt;
      } else if (e.symbol === EAsset.MINA) {
        result.minaPriceInUsd = e.priceUsd;
        result.minaPriceUpdatedAt = e.updatedAt;
      }
    });

    return result;
  }
  async getProofOfAssets(): Promise<GetProofOfAssetsResponseDto> {
    const config = await this.commonConfigRepository.findOneBy({});
    assert(config, 'invalid config, please seed the value');
    const totalWethInCirculation = new BigNumber(config.totalWethMinted)
      .minus(config.totalWethBurnt)
      .div(BigNumber(DECIMAL_BASE).pow(+this.configService.get(EEnvKey.DECIMAL_TOKEN_MINA)))
      .toString();
    return {
      totalWethInCirculation,
    };
  }
  calcWaitingTime(receivedNetwork: ENetworkName, currentPendingTx: number) {
    const waitCrawlMinaTime = Number(this.configService.get(EEnvKey.MINA_CRAWL_SAFE_BLOCK)) * 3 * 60; // ~ 3 min per block
    const waitCrawlEthTime = Number(this.configService.get(EEnvKey.EVM_SAFE_BLOCK)) * 10 // 10 secs a block

    const enqueuedAndProcessTime = {
      [ENetworkName.MINA]: 10 * 60 * (1 + currentPendingTx),
      [ENetworkName.ETH]: 10 * (1 + currentPendingTx),
    };
    // total waiting tx * time_process_each + crawler delays from both lock and unlock
    return { waitCrawlEthTime, waitCrawlMinaTime, completeTimeEstimated: enqueuedAndProcessTime[receivedNetwork] + waitCrawlEthTime + waitCrawlMinaTime };
  }
  async estimateBridgeTime(receivedNetwork: ENetworkName) {
    const result = {
      receivedNetwork,
      ...this.calcWaitingTime(
        receivedNetwork,
        await this.redisClientService.getCountWaitingTx(receivedNetwork),
      ),
    };
    return result;
  }
}
