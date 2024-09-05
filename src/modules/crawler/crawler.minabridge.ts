import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import dayjs from 'dayjs';
import { Logger } from 'log4js';
import { Field, Mina, PublicKey, UInt32 } from 'o1js';
import { DataSource, QueryRunner } from 'typeorm';

import { EEventName, EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';

import { CrawlContract, EventLog } from '@modules/crawler/entities';

import { LoggerService } from '@shared/modules/logger/logger.service';

import { Bridge } from './minaSc/minaBridgeSC';

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
  }
  public async handleEventCrawlBlock() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { startBlockNumber } = await this.getFromToBlock();

      const Network = Mina.Network({
        mina: this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS),
        archive: this.configService.get(EEnvKey.MINA_BRIDGE_ARCHIVE_RPC_OPTIONS),
      });
      Mina.setActiveInstance(Network);
      const zkappAddress = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS));

      const zkapp = new Bridge(zkappAddress);
      const events = await zkapp.fetchEvents(UInt32.from(Number(startBlockNumber) + 1));
      this.logger.info({ events });

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
      this.logger.info(`[handleCrawlMinaBridge] Crawled from============================= ${startBlockNumber}`);
      if (events.length > 0) {
        // udpate current latest block
        await this.updateLatestBlockCrawl(Number(events.pop().blockHeight.toString()), queryRunner);
      }
      return await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async handlerUnLockEvent(event, queryRunner: QueryRunner) {
    const existLockTx = await queryRunner.manager.findOne(EventLog, {
      where: { id: event.event.data.id.toString() },
    });

    if (!existLockTx) {
      return;
    }

    await queryRunner.manager.update(EventLog, existLockTx.id, {
      status: EEventStatus.COMPLETED,
      txHashUnlock: event.event.transactionInfo.transactionHash,
      amountReceived: event.event.data.amount.toString(),
      tokenReceivedAddress: event.event.data.tokenAddress.toBase58(),
      tokenReceivedName: 'WETH',
    });
  }

  private async handlerLockEvent(event, queryRunner: QueryRunner) {
    const field = Field.from(event.event.data.receipt.toString());
    const receiveAddress = '0x' + field.toBigInt().toString(16);

    const eventUnlock = {
      senderAddress: event.event.data.locker.toBase58(),
      amountFrom: event.event.data.amount.toString(),
      tokenFromAddress: this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS),
      networkFrom: ENetworkName.MINA,
      networkReceived: ENetworkName.ETH,
      tokenFromName: 'WETH',
      tokenReceivedAddress: this.configService.get(EEnvKey.ETH_TOKEN_BRIDGE_ADDRESS),
      txHashLock: event.event.transactionInfo.transactionHash,
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
  }

  private async updateLatestBlockCrawl(blockNumber: number, queryRunner: QueryRunner) {
    await queryRunner.manager.update(
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

  private async getFromToBlock(): Promise<{ startBlockNumber; toBlock }> {
    let toBlock;
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

    return { startBlockNumber, toBlock };
  }
}
