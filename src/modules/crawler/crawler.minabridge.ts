import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EEventName, EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';
// import { LoggerService } from '@shared/modules/logger/logger.service';
import { ETHBridgeContract } from '@shared/modules/web3/web3.service';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { EventData } from 'web3-eth-contract';
import { CrawlContract, EventLog } from '@modules/crawler/entities'

import { Mina, PublicKey, SmartContract, UInt32, fetchAccount, PrivateKey } from 'o1js';
import { TestEvent } from './add.js';

@Injectable()
export class BlockchainMinaCrawler {
  private readonly numberOfBlockPerJob: number;
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    // private loggerService: LoggerService,
    private readonly ethBridgeContract: ETHBridgeContract,
    private readonly crawlContractRepository: CrawlContractRepository,
  ) {
    this.numberOfBlockPerJob = +this.configService.get<number>(EEnvKey.NUMBER_OF_BLOCK_PER_JOB);

  }
  // private logger = this.loggerService.getLogger('CrawlContractEVMBridge');
  public async handleEventCrawlBlock() {
    try {
        // const {startBlockNumber, toBlock} = await this.getFromToBlock();
        // const events = await this.ethBridgeContract.getEvent(startBlockNumber, toBlock);
        // console.log({events});

      const Network = Mina.Network({
      mina: 'https://api.minascan.io/node/berkeley/v1/graphql',
      archive: 'https://api.minascan.io/archive/berkeley/v1/graphql/',
      });
      Mina.setActiveInstance(Network);
      let zkappAddress = PublicKey.fromBase58(
        'B62qm7xwx5pp9kgtPSsAQrm99fBUzwcPoG6EWWqG7b8mnZ8UoKgevjd'
      );
      const zkapp = new TestEvent(zkappAddress);
      const events = await zkapp.fetchEvents(UInt32.from(0));

      for (const event of events) {
        switch (event.type) {
          case 'ChangeState':
            await this.handleEvent(
              JSON.stringify(event.event),
              this.handlerLockEvent.bind(this),
            );
            break;
          // case 'Unlock':
          //   await this.handleEvent(
          //     event,
          //     this.handlerUnLockEvent.bind(this),
          //   );
          //   break;
          default:
            continue;
        }
      }
      // console.log(
      //   `[handleCrawlETHBridge] Crawled from============================= ${startBlockNumber} to ${toBlock}`,
      // );
      // await this.handleEvent(toBlock, this.updateLatestBlockCrawl.bind(this))
        
    } catch (error) {
      throw error;
    } finally {
    }
  }

  private async handleEvent(event, callback: CallableFunction) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await callback(event, queryRunner);
      return await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      // this.logger.error(error);
    } finally {
      await queryRunner.release();
    }
  }

  private async handlerLockEvent(
    event,
    queryRunner: QueryRunner,
  ) {
    const objectEvent = JSON.parse(event);
    
    const eventUnlock = {
      senderAddress: "event.returnValues.receiver",
      amountFrom: objectEvent.data.amount1,
      tokenFromAddress: "event.returnValues.token",
      networkFrom: ENetworkName.MINA,
      networkReceived: ENetworkName.ETH,
      tokenFromName: 'ETH',
      txHashLock: objectEvent.transactionInfo.transactionHash,
      receiveAddress: "event.returnValues.receiver",
      blockNumber: event.blockNumber,
      event: EEventName.LOCK,
      returnValues: event,
      status: EEventStatus.WAITING,
      retry: 0,
    }

    await queryRunner.manager.save(EventLog, eventUnlock);
  }

  private async handlerUnLockEvent(
    event: EventData,
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
      networkReceived: ENetworkName.MINA,
      tokenReceivedName: "ETH",
    });
  }

  private async updateLatestBlockCrawl(blockNumber: number, queryRunner: QueryRunner) {
    await queryRunner.manager.update(CrawlContract, 
      {
      contractAddress: "0x00bA9C6204C791543B95a29cA1f0DDE68e228224",
      networkName: 'eth'
      }, {
      latestBlock: blockNumber
      })
  }

  private async getFromToBlock(): Promise<{startBlockNumber, toBlock}> {

    let startBlockNumber = this.ethBridgeContract.getStartBlock();
    const latestBlock = await this.ethBridgeContract.getBlockNumber();
    let toBlock;

    let currentCrawledBlock = await this.crawlContractRepository.findOne({
      where: { networkName: ENetworkName.ETH },
    });
    if (!currentCrawledBlock) {
      const tmpData = this.crawlContractRepository.create({
        contractAddress: this.ethBridgeContract.getContractAddress(),
        networkName: ENetworkName.ETH,
        latestBlock: startBlockNumber,
      });
      currentCrawledBlock = await this.crawlContractRepository.save(tmpData);
    } else {
      startBlockNumber = currentCrawledBlock.latestBlock;
    }
  
    if (latestBlock >= Number(startBlockNumber) + Number(this.numberOfBlockPerJob)) {
      toBlock = Number(startBlockNumber) + this.numberOfBlockPerJob;
    }

    return {startBlockNumber, toBlock }
  }
}
