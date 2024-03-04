import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EEventName, EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';
// import { LoggerService } from '@shared/modules/logger/logger.service';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import { CrawlContract, EventLog } from '@modules/crawler/entities'

import { Mina, PublicKey, UInt32, Field } from 'o1js';

import Token from './minaSc/minaTokenErc20.js';
import dayjs from'dayjs';

@Injectable()
export class SCTokenMinaCrawler {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    // private loggerService: LoggerService,
    private readonly crawlContractRepository: CrawlContractRepository,
    private readonly tokenPairRepository: TokenPairRepository,

  ) {

  }
  public async handleEventCrawlBlock() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const {startBlockNumber, toBlock} = await this.getFromToBlock();

      const Network = Mina.Network({
      mina: this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS),
      archive: 'https://api.minascan.io/archive/berkeley/v1/graphql/',
      });
      Mina.setActiveInstance(Network);
      let zkAppToken = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS));

      let zkAppToke = new Token(zkAppToken);
      const events = await zkAppToke.fetchEvents(UInt32.from(Number(startBlockNumber) + 1));
      
      console.log({events});
      
      for (const event of events) {
        switch (event.type) {
          case 'Lock':
            await this.handlerLockEvent(event, queryRunner);
            break;
          default:
            continue;
        }
      }
      console.log(
        `[handleCrawlMinaBridge] Crawled from============================= ${startBlockNumber}`,
      );
      if(events.length > 0) {
        await this.updateLatestBlockCrawl(Number(events.reverse()[0].blockHeight.toString()), queryRunner)
      }
      return await queryRunner.commitTransaction();
        
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async handlerLockEvent(
    event,
    queryRunner: QueryRunner,
  ) {

    const field = Field.from(event.event.data.receipt.toString());
    const receiveAddress = "0x" + field.toBigInt().toString(16);

    const timeLock = await this.getDateTimeByBlock(event.blockHeight.toString());

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
      blockTimeLock: Number(timeLock),
      event: EEventName.LOCK,
      returnValues: JSON.stringify(event),
      status: EEventStatus.WAITING,
      retry: 0,
      fromTokenDecimal: null,
      toTokenDecimal: null
    }

    const tokenPair = await this.tokenPairRepository.getTokenPair(this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS), this.configService.get(EEnvKey.ETH_TOKEN_BRIDGE_ADDRESS));
    if(!tokenPair) {
      eventUnlock.status = EEventStatus.NOTOKENPAIR
    } else {
      eventUnlock.fromTokenDecimal = tokenPair.fromDecimal
      eventUnlock.toTokenDecimal = tokenPair.toDecimal
    }

    await queryRunner.manager.save(EventLog, eventUnlock);
  }

  private async updateLatestBlockCrawl(blockNumber: number, queryRunner: QueryRunner) {
    await queryRunner.manager.update(CrawlContract, 
      {
      contractAddress: this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS),
      networkName: ENetworkName.MINA
      }, {
      latestBlock: blockNumber
      })
  }

  private async getFromToBlock(): Promise<{startBlockNumber, toBlock}> {
    let toBlock;    
    let currentCrawledBlock = await this.crawlContractRepository.findOne({
      where: { networkName: ENetworkName.MINA,
        contractAddress: this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS)},
    });
    let startBlockNumber = Number(this.configService.get(EEnvKey.MINA_BRIDGE_START_BLOCK))

    if (!currentCrawledBlock) {
      const tmpData = this.crawlContractRepository.create({
        contractAddress: this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS),
        networkName: ENetworkName.MINA,
        latestBlock: startBlockNumber,
      });
      await this.crawlContractRepository.save(tmpData);
    } else {
      startBlockNumber = currentCrawledBlock.latestBlock;
    }
  
    // if (latestBlock >= Number(startBlockNumber) + Number(this.numberOfBlockPerJob)) {
    //   toBlock = Number(startBlockNumber) + this.numberOfBlockPerJob;
    // }

    return {startBlockNumber, toBlock }
  }

  private async getDateTimeByBlock(blockNumber: number) {
    const endpoint = 'https://berkeley.graphql.minaexplorer.com/'; // Replace with your GraphQL endpoint
    const query = `
      query {
          transaction(query: {blockHeight: ${blockNumber}}) {
            dateTime
          }
        }
    `;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
      }),
    });
  
    const result = await response.json();
    const dateTime = dayjs(result.data.transaction.dateTime);

    // Convert DateTime to Unix timestamp in seconds
    const unixTimestampInSeconds = Math.floor(dateTime.valueOf() / 1000);
    return unixTimestampInSeconds
  }
}
