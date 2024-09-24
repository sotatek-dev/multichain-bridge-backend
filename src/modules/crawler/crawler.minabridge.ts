import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';
import { Logger } from 'log4js';
import { fetchLastBlock, Field, Mina, PublicKey, UInt32 } from 'o1js';
import { DataSource, QueryRunner } from 'typeorm';

import { EAsset } from '../../constants/api.constant.js';
import { DEFAULT_ADDRESS_PREFIX, EEventName, EEventStatus, ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { CrawlContractRepository } from '../../database/repositories/crawl-contract.repository.js';
import { TokenPairRepository } from '../../database/repositories/token-pair.repository.js';
import { CrawlContract, EventLog } from '../../modules/crawler/entities/index.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { Bridge } from './minaSc/Bridge.js';

@Injectable()
export class SCBridgeMinaCrawler {
  private readonly logger: Logger;
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly crawlContractRepository: CrawlContractRepository,
    private readonly tokenPairRepository: TokenPairRepository,
    private readonly loggerService: LoggerService,
  ) {
    this.logger = this.loggerService.getLogger('SC_BRIDGE_MINA_CRAWLER');
    const Network = Mina.Network({
      mina: this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS),
      archive: this.configService.get(EEnvKey.MINA_BRIDGE_ARCHIVE_RPC_OPTIONS),
    });
    Mina.setActiveInstance(Network);
  }
  public async handleEventCrawlBlock() {
    const { startBlockNumber, toBlock } = await this.getFromToBlock();
    if (startBlockNumber.greaterThanOrEqual(toBlock).toBoolean()) {
      this.logger.warn('Already latest block. Skipped.');
      return;
    }
    const zkappAddress = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS));
    const zkapp = new Bridge(zkappAddress);

    const events = await zkapp.fetchEvents(startBlockNumber.add(1), toBlock);
    this.logger.info({ events });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      this.logger.info(`[handleCrawlMinaBridge] Crawling from  ${startBlockNumber} to ${toBlock}`);
      for (const event of events) {
        switch (event.type) {
          case 'Unlock':
            await this.handlerUnLockEvent(event, queryRunner);
            break;
          case 'Lock':
            await this.handlerLockEvent(event, queryRunner);
            break;
          default:
            continue;
        }
      }
      // udpate current latest block
      await this.updateLatestBlockCrawl(Number(toBlock.toString()), queryRunner);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  public async handlerUnLockEvent(event, queryRunner: QueryRunner) {
    const existLockTx = await queryRunner.manager.findOne(EventLog, {
      where: { id: event.event.data.id.toString() },
    });

    if (!existLockTx) {
      return;
    }

    await queryRunner.manager.update(EventLog, existLockTx.id, {
      status: EEventStatus.COMPLETED,
      txHashUnlock: event.event.transactionInfo.transactionHash,
      // amountReceived: event.event.data.amount.toString(),
      // tokenReceivedAddress: event.event.data.tokenAddress,
      tokenReceivedName: EAsset.WETH,
    });

    return {
      success: true,
    };
  }

  public async handlerLockEvent(event: any, queryRunner: QueryRunner) {
    const txHashLock = event.event.transactionInfo.transactionHash;
    const field = Field.from(event.event.data.receipt.toString());
    const receiveAddress = DEFAULT_ADDRESS_PREFIX + field.toBigInt().toString(16);

    const isExist = await queryRunner.manager.findOneBy(EventLog, { txHashLock });
    if (isExist) {
      this.logger.warn('Duplicated event', txHashLock);
      return;
    }
    const eventUnlock = {
      senderAddress: JSON.parse(JSON.stringify(event.event.data.locker)),
      amountFrom: event.event.data.amount.toString(),
      tokenFromAddress: this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS),
      networkFrom: ENetworkName.MINA,
      networkReceived: ENetworkName.ETH,
      tokenFromName: EAsset.WETH,
      tokenReceivedAddress: this.configService.get(EEnvKey.ETH_TOKEN_BRIDGE_ADDRESS),
      txHashLock,
      receiveAddress: receiveAddress,
      blockNumber: event.blockHeight.toString(),
      blockTimeLock: Number(Math.floor(dayjs().valueOf() / 1000)),
      event: EEventName.LOCK,
      returnValues: JSON.stringify(event),
      status: EEventStatus.WAITING,
      retry: 0,
      fromTokenDecimal: null,
      toTokenDecimal: null,
    };

    const tokenPair = await this.tokenPairRepository.getTokenPair(
      this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS),
      this.configService.get(EEnvKey.ETH_TOKEN_BRIDGE_ADDRESS),
    );
    if (!tokenPair) {
      eventUnlock.status = EEventStatus.NOTOKENPAIR;
    } else {
      eventUnlock.fromTokenDecimal = tokenPair.fromDecimal;
      eventUnlock.toTokenDecimal = tokenPair.toDecimal;
    }

    this.logger.info({ eventUnlock });

    await queryRunner.manager.save(EventLog, eventUnlock);

    return {
      success: true,
    };
  }

  private updateLatestBlockCrawl(blockNumber: number, queryRunner: QueryRunner) {
    return queryRunner.manager.update(
      CrawlContract,
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
        .sub(this.configService.get<number>(EEnvKey.MINA_CRAWL_SAFE_BLOCK))
        .toString(),
    );

    return { startBlockNumber: UInt32.from(startBlockNumber), toBlock };
  }
}
