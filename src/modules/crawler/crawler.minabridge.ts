import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import assert from 'assert';
import { BigNumber } from 'bignumber.js';
import dayjs from 'dayjs';
import { Logger } from 'log4js';
import { fetchLastBlock, Field, Mina, PublicKey, UInt32 } from 'o1js';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { EAsset } from '../../constants/api.constant.js';
import { DEFAULT_ADDRESS_PREFIX, EEventName, EEventStatus, ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { CrawlContractRepository } from '../../database/repositories/crawl-contract.repository.js';
import { CrawlContract, EventLog } from '../../modules/crawler/entities/index.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { calculateUnlockFee, removeSuffixDecimal } from '../../shared/utils/bignumber.js';
import { CommonConfig } from './entities/common-config.entity.js';
import { Bridge } from './minaSc/Bridge.js';
import { RedisClientService } from '../../shared/modules/redis/redis-client.service.js';
import { getMinaNetworkId } from '../../shared/utils/util.js';

interface IMinaLockTokenEventData {
  id: UInt32;
  tokenAddress: PublicKey;
}
interface IMinaEvent {
  type: string;
  event: {
    data: any;
    transactionInfo: {
      transactionHash: string;
      transactionStatus: string;
      transactionMemo: string;
    };
  };
  blockHeight: UInt32;
  blockHash: string;
  parentBlockHash: string;
  globalSlot: UInt32;
  chainStatus: string;
}
@Injectable()
export class SCBridgeMinaCrawler {
  private readonly logger: Logger;
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly crawlContractRepository: CrawlContractRepository,
    private readonly loggerService: LoggerService,
    private readonly redisClient: RedisClientService
  ) {
    this.logger = this.loggerService.getLogger('SC_BRIDGE_MINA_CRAWLER');
    const Network = Mina.Network({
      mina: this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS),
      archive: this.configService.get(EEnvKey.MINA_BRIDGE_ARCHIVE_RPC_OPTIONS),
      networkId: getMinaNetworkId()
    });
    Mina.setActiveInstance(Network);
  }
  public async handleEventCrawlBlock() {
    const { startBlockNumber, toBlock } = await this.getFromToBlock();
    if (startBlockNumber.greaterThanOrEqual(toBlock).toBoolean()) {
      this.logger.warn('Already latest block. Skipped.');
      return;
    }
    const zkappAddress = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS)!);
    const zkapp = new Bridge(zkappAddress);

    const events = await zkapp.fetchEvents(startBlockNumber.add(1), toBlock);
    this.logger.info({ events });

    try {
      await this.dataSource.transaction(async entityManager => {
        this.logger.info(`[handleCrawlMinaBridge] Crawling from  ${startBlockNumber} to ${toBlock}`);
        const configRepo = entityManager.getRepository(CommonConfig);
        const eventLogRepo = entityManager.getRepository(EventLog);
        for (const event of events) {
          switch (event.type) {
            case 'Unlock':
              await this.handlerUnLockEvent(event, eventLogRepo, configRepo);
              break;
            case 'Lock':
              await this.handlerLockEvent(event, eventLogRepo, configRepo);
              break;
            default:
              continue;
          }
        }
        // udpate current latest block
        await this.updateLatestBlockCrawl(Number(toBlock.toString()), entityManager);
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  public async handlerUnLockEvent(
    event: IMinaEvent,
    eventLogRepo: Repository<EventLog>,
    configRepo: Repository<CommonConfig>,
  ) {
    const { id, tokenAddress } = event.event.data as IMinaLockTokenEventData;
    const existLockTx = await eventLogRepo.findOneBy({
      id: Number(id.toString()),
    });
    if (!existLockTx) {
      return;
    }

    await eventLogRepo.update(existLockTx.id, {
      status: EEventStatus.COMPLETED,
      txHashUnlock: event.event.transactionInfo.transactionHash,
      amountReceived: event.event.data.amount.toString(),
      tokenReceivedAddress: tokenAddress.toBase58(),
      tokenReceivedName: EAsset.WETH,
    });

    // update total weth minted
    const currentConfig = await configRepo.findOneBy({});
    assert(currentConfig, 'comomn config not exist');
    const newTotalEthMinted = new BigNumber(currentConfig.totalWethMinted).plus(existLockTx.amountReceived).toString();

    this.logger.info(`Current total minted ${currentConfig.totalWethMinted}`);
    this.logger.info(`New total minted ${newTotalEthMinted}`);

    await configRepo.update(currentConfig.id, { totalWethMinted: newTotalEthMinted });
    return {
      success: true,
    };
  }

  public async handlerLockEvent(
    event: IMinaEvent,
    eventLogRepo: Repository<EventLog>,
    configRepo: Repository<CommonConfig>,
  ) {
    const txHashLock = event.event.transactionInfo.transactionHash;
    const field = Field.from(event.event.data.receipt.toString());
    const receiveAddress = DEFAULT_ADDRESS_PREFIX + field.toBigInt().toString(16);
    const inputAmount = event.event.data.amount.toString();
    const isExist = await eventLogRepo.findOneBy({ txHashLock });
    if (isExist) {
      this.logger.warn('Duplicated event', txHashLock);
      return;
    }
    const fromTokenDecimal = this.configService.get(EEnvKey.DECIMAL_TOKEN_MINA),
      toTokenDecimal = this.configService.get(EEnvKey.DECIMAL_TOKEN_EVM);
    const config = await configRepo.findOneBy({});

    assert(!!config?.tip, 'tip config undefined');

    const {
      tipWithDecimalPlaces,
      gasFeeWithDecimalPlaces,
      amountReceiveNoDecimalPlace,
      protocolFeeNoDecimalPlace,
      success,
    } = calculateUnlockFee({
      fromDecimal: fromTokenDecimal,
      toDecimal: toTokenDecimal,
      inputAmountNoDecimalPlaces: inputAmount,
      gasFeeWithDecimalPlaces: config.feeUnlockEth,
      tipPercent: Number(config.tip).valueOf(),
    });
    const eventUnlock: Partial<EventLog> = {
      senderAddress: JSON.parse(JSON.stringify(event.event.data.locker)),
      amountFrom: inputAmount,
      tokenFromAddress: this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS),
      networkFrom: ENetworkName.MINA,
      networkReceived: ENetworkName.ETH,
      tokenFromName: EAsset.WETH,
      tokenReceivedAddress: this.configService.get(EEnvKey.ETH_TOKEN_BRIDGE_ADDRESS),
      txHashLock,
      receiveAddress: receiveAddress,
      blockNumber: +event.blockHeight.toString(),
      blockTimeLock: Number(Math.floor(dayjs().valueOf() / 1000)),
      event: EEventName.LOCK,
      returnValues: JSON.stringify(event),
      status: success ? EEventStatus.WAITING : EEventStatus.FAILED,
      retry: 0,
      fromTokenDecimal,
      toTokenDecimal,
      gasFee: gasFeeWithDecimalPlaces,
      tip: tipWithDecimalPlaces,
      amountReceived: amountReceiveNoDecimalPlace,
      protocolFee: protocolFeeNoDecimalPlace,
      errorDetail: success ? '' : 'invalid amount'
    };

    const result = await eventLogRepo.save(eventUnlock);
    this.logger.info(result);
    try {
      await this.redisClient.updateDailyQuota(result.senderAddress, result.tokenFromAddress, result.networkFrom, removeSuffixDecimal(result.amountFrom, result.fromTokenDecimal))
    } catch (error) {
      this.logger.error(error)
    }
    return {
      success: true,
    };
  }

  public async updateLatestBlockCrawl(blockNumber: number, entityManager: EntityManager) {
    const crawlContractRepo = entityManager.getRepository(CrawlContract);
    await crawlContractRepo.update(
      {
        contractAddress: this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS),
        networkName: ENetworkName.MINA,
      },
      {
        latestBlock: blockNumber,
      },
    );
  }

  private async getFromToBlock(): Promise<{ startBlockNumber: UInt32; toBlock: UInt32 }> {
    const currentCrawledBlock = await this.crawlContractRepository.findOne({
      where: {
        networkName: ENetworkName.MINA,
        contractAddress: this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS),
      },
    });
    let startBlockNumber = Number(this.configService.get(EEnvKey.MINA_BRIDGE_START_BLOCK));

    if (!currentCrawledBlock) {
      const tmpData = this.crawlContractRepository.create({
        contractAddress: this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS),
        networkName: ENetworkName.MINA,
        latestBlock: startBlockNumber,
      });
      await this.crawlContractRepository.save(tmpData);
    } else {
      startBlockNumber = currentCrawledBlock.latestBlock;
    }
    const latestBlock = await fetchLastBlock(this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS));

    const toBlock = UInt32.from(
      latestBlock.blockchainLength
        .toUInt64()
        .sub(this.configService.get<number>(EEnvKey.MINA_CRAWL_SAFE_BLOCK) ?? 3)
        .toString(),
    );

    return { startBlockNumber: UInt32.from(startBlockNumber), toBlock };
  }
}
