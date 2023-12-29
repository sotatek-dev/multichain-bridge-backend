import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EEventName, EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';
// import { LoggerService } from '@shared/modules/logger/logger.service';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { CrawlContract, EventLog } from '@modules/crawler/entities'

import { Mina, PublicKey, SmartContract, UInt32, fetchAccount, PrivateKey, fetchLastBlock } from 'o1js';
import { Bridge } from './bridgeSC.js';
import dayjs from'dayjs';

@Injectable()
export class BlockchainMinaCrawler {
  // private readonly numberOfBlockPerJob: number;
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    // private loggerService: LoggerService,
    private readonly crawlContractRepository: CrawlContractRepository,
  ) {
    // this.numberOfBlockPerJob = +this.configService.get<number>(EEnvKey.NUMBER_OF_BLOCK_PER_JOB);

  }
  // private logger = this.loggerService.getLogger('CrawlContractEVMBridge');
  public async handleEventCrawlBlock() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
        const {startBlockNumber, toBlock} = await this.getFromToBlock();

      const Network = Mina.Network({
      mina: 'https://api.minascan.io/node/berkeley/v1/graphql',
      archive: 'https://api.minascan.io/archive/berkeley/v1/graphql/',
      });
      Mina.setActiveInstance(Network);
      let zkappAddress = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS));
      const zkapp = new Bridge(zkappAddress);
      const events = await zkapp.fetchEvents(UInt32.from(Number(startBlockNumber) + 1));
      const time = await this.getDateTimeByBlock(26164);
      console.log({time});
      for (const event of events) {
        console.log({event});
        console.log("global", event.globalSlot.value.toString());
        console.log("global", event.event.transactionInfo);
        
        switch (event.type) {
          case 'Lock':
            // await this.handlerLockEvent(event, queryRunner);
            break;
          case 'Unlock':
            // await this.handlerUnLockEvent(event, queryRunner);
            break;
          default:
            continue;
        }
      }
      console.log(
        `[handleCrawlMinaBridge] Crawled from============================= ${startBlockNumber}`,
      );
      if(events.length > 0) {
        // await this.updateLatestBlockCrawl(Number(events.reverse()[0].blockHeight.value), queryRunner)
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
    console.log("====event", event.event.data.amount1.toString());
    console.log("====event", event.event.data.amount2.toString());
    console.log("====event", event.event.transactionInfo);
    console.log("====blockNumber", event.blockHeight.toString());
    
    const eventUnlock = {
      senderAddress: "event.returnValues.locker",
      amountFrom: event.event.data.amount1.toString(),
      tokenFromAddress: "event.returnValues.token",
      networkFrom: ENetworkName.MINA,
      networkReceived: ENetworkName.ETH,
      tokenFromName: "event.returnValues.tokenName",
      tokenReceivedAddress: this.configService.get(EEnvKey.ETH_TOKEN_BRIDGE_ADDRESS),
      txHashLock: event.event.transactionInfo.transactionHash,
      receiveAddress: "event.returnValues.receipt",
      blockNumber: event.blockHeight.toString(),
      event: EEventName.LOCK,
      returnValues: JSON.stringify(event),
      status: EEventStatus.WAITING,
      retry: 0,
    }
    await queryRunner.manager.save(EventLog, eventUnlock);
  }

  private async handlerUnLockEvent(
    event,
    queryRunner: QueryRunner,
  ) {

    let existLockTx = await queryRunner.manager.findOne(EventLog, {
      where: { txHashLock: event.returnValues.hash },
    })

    await queryRunner.manager.update(EventLog, existLockTx.id, {
      status: EEventStatus.DONE,
      txHashUnlock: event.transactionHash,
      amountReceived: event.returnValues.amount,
      tokenReceivedAddress: event.returnValues.token,
      protocolFee: event.returnValues.fee,
      tokenReceivedName: "ETH",
    });
  }

  private async updateLatestBlockCrawl(blockNumber: number, queryRunner: QueryRunner) {
    await queryRunner.manager.update(CrawlContract, 
      {
      contractAddress: this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS),
      networkName: ENetworkName.MINA
      }, {
      latestBlock: blockNumber
      })
  }

  private async getFromToBlock(): Promise<{startBlockNumber, toBlock}> {
    // const latestBlock = await fetchLastBlock('https://api.minascan.io/node/berkeley/v1/graphql');
    let toBlock;    
    let currentCrawledBlock = await this.crawlContractRepository.findOne({
      where: { networkName: ENetworkName.MINA },
    });
    let startBlockNumber = Number(this.configService.get(EEnvKey.MINA_BRIDGE_START_BLOCK))

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
            block {
              dateTime
            }
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
    const dateTime = dayjs(result.data.transaction.block.dateTime);

    // Convert DateTime to Unix timestamp in seconds
    const unixTimestampInSeconds = Math.floor(dateTime.valueOf() / 1000);
    return unixTimestampInSeconds
  }
}
