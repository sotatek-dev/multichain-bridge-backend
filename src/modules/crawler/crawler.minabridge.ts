import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { LoggerService } from '@shared/modules/logger/logger.service';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { Mina, PublicKey, UInt32 } from 'o1js';
import { DataSource, QueryRunner } from 'typeorm';

import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';

import { CrawlContract, EventLog } from '@modules/crawler/entities';

import { Bridge } from './minaSc/minaBridgeSC';

@Injectable()
export class SCBridgeMinaCrawler {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    // private loggerService: LoggerService,
    private readonly crawlContractRepository: CrawlContractRepository,
  ) {}
  public async handleEventCrawlBlock() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { startBlockNumber, toBlock } = await this.getFromToBlock();

      const Network = Mina.Network({
        mina: this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS),
        archive: 'https://api.minascan.io/archive/berkeley/v1/graphql/',
      });
      Mina.setActiveInstance(Network);
      let zkappAddress = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS));
      let zkAppToken = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS));

      const zkapp = new Bridge(zkappAddress);
      const events = await zkapp.fetchEvents(UInt32.from(Number(startBlockNumber) + 1));
      console.log({ events });

      for (const event of events) {
        switch (event.type) {
          case 'Unlock':
            await this.handlerUnLockEvent(event, queryRunner);
            break;
          default:
            continue;
        }
      }
      console.log(`[handleCrawlMinaBridge] Crawled from============================= ${startBlockNumber}`);
      if (events.length > 0) {
        await this.updateLatestBlockCrawl(Number(events.reverse()[0].blockHeight.toString()), queryRunner);
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
    let existLockTx = await queryRunner.manager.findOne(EventLog, {
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
    let currentCrawledBlock = await this.crawlContractRepository.findOne({
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
