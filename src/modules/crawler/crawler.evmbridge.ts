import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrawlContractRepository } from '../../database/repositories/crawl-contract.repository.js';
import { TokenPairRepository } from '../../database/repositories/token-pair.repository.js';
import { Logger } from 'log4js';
import { DataSource, QueryRunner } from 'typeorm';
import { EventData } from 'web3-eth-contract';

import { EAsset } from '../../constants/api.constant.js';
import { EEventName, EEventStatus, ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';

import { CrawlContract, EventLog } from '../../modules/crawler/entities/index.js';

import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { ETHBridgeContract } from '../../shared/modules/web3/web3.service.js';

@Injectable()
export class BlockchainEVMCrawler {
  private readonly numberOfBlockPerJob: number;
  private readonly logger: Logger;
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly crawlContractRepository: CrawlContractRepository,
    private readonly tokenPairRepository: TokenPairRepository,
    private readonly loggerService: LoggerService,
    private readonly ethBridgeContract: ETHBridgeContract,
  ) {
    this.numberOfBlockPerJob = +this.configService.get<number>(EEnvKey.NUMBER_OF_BLOCK_PER_JOB);
    this.logger = loggerService.getLogger('BLOCKCHAIN_EVM_CRAWLER');
  }

  public async handleEventCrawlBlock() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { startBlockNumber, toBlock } = await this.getFromToBlock();
      const events = await this.ethBridgeContract.getEvent(startBlockNumber, toBlock);

      for (const event of events) {
        switch (event.event) {
          case 'Lock':
            await this.handlerLockEvent(event, queryRunner);
            break;
          case 'Unlock':
            await this.handlerUnLockEvent(event, queryRunner);
            break;
          default:
            continue;
        }
      }
      this.logger.info(`[handleCrawlETHBridge] Crawled from ${startBlockNumber} to ${toBlock}`);
      await this.updateLatestBlockCrawl(toBlock, queryRunner);
      return await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  public async handlerLockEvent(event: EventData, queryRunner: QueryRunner) {
    const blockTimeOfBlockNumber = await this.ethBridgeContract.getBlockTimeByBlockNumber(event.blockNumber);
    const eventUnlock = {
      senderAddress: event.returnValues.locker,
      amountFrom: event.returnValues.amount,
      tokenFromAddress: event.returnValues.token,
      networkFrom: ENetworkName.ETH,
      networkReceived: ENetworkName.MINA,
      tokenFromName: event.returnValues.tokenName,
      tokenReceivedAddress: this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS),
      txHashLock: event.transactionHash,
      receiveAddress: event.returnValues.receipt,
      blockNumber: event.blockNumber,
      blockTimeLock: Number(blockTimeOfBlockNumber.timestamp),
      event: EEventName.LOCK,
      returnValues: JSON.stringify(event.returnValues),
      status: EEventStatus.WAITING,
      retry: 0,
      fromTokenDecimal: null,
      toTokenDecimal: null,
    };

    const tokenPair = await this.tokenPairRepository.getTokenPair(
      this.configService.get(EEnvKey.ETH_TOKEN_BRIDGE_ADDRESS),
      this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS),
    );
    if (!tokenPair) {
      eventUnlock.status = EEventStatus.NOTOKENPAIR;
    } else {
      eventUnlock.fromTokenDecimal = tokenPair.fromDecimal;
      eventUnlock.toTokenDecimal = tokenPair.toDecimal;
    }

    await queryRunner.manager.save(EventLog, eventUnlock);

    return {
      success: true,
    };
  }

  public async handlerUnLockEvent(event: EventData, queryRunner: QueryRunner) {
    const existLockTx = await queryRunner.manager.findOne(EventLog, {
      where: { txHashLock: event.returnValues.hash },
    });
    if (!existLockTx) {
      return;
    }

    await queryRunner.manager.update(EventLog, existLockTx.id, {
      status: EEventStatus.COMPLETED,
      txHashUnlock: event.transactionHash,
      amountReceived: event.returnValues.amount,
      tokenReceivedAddress: event.returnValues.token,
      protocolFee: event.returnValues.fee,
      tokenReceivedName: EAsset.ETH,
    });

    return {
      success: true,
    };
  }

  public async updateLatestBlockCrawl(blockNumber: number, queryRunner: QueryRunner) {
    await queryRunner.manager.update(
      CrawlContract,
      {
        contractAddress: this.configService.get(EEnvKey.ETH_BRIDGE_CONTRACT_ADDRESS),
        networkName: ENetworkName.ETH,
      },
      {
        latestBlock: blockNumber,
      },
    );
  }

  private async getFromToBlock(): Promise<{ startBlockNumber; toBlock }> {
    let startBlockNumber = this.ethBridgeContract.getStartBlock();
    let toBlock = await this.ethBridgeContract.getBlockNumber();

    const currentCrawledBlock = await this.crawlContractRepository.findOne({
      where: { networkName: ENetworkName.ETH },
    });
    if (!currentCrawledBlock) {
      const tmpData = this.crawlContractRepository.create({
        contractAddress: this.ethBridgeContract.getContractAddress(),
        networkName: ENetworkName.ETH,
        latestBlock: startBlockNumber,
      });
      await this.crawlContractRepository.save(tmpData);
    } else {
      startBlockNumber = Number(currentCrawledBlock.latestBlock) + 1;
    }

    if (toBlock >= Number(startBlockNumber) + Number(this.numberOfBlockPerJob)) {
      toBlock = Number(startBlockNumber) + this.numberOfBlockPerJob;
    }

    return { startBlockNumber, toBlock };
  }
}
