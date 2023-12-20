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

@Injectable()
export class BlockchainEVMCrawler {
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
        const {startBlockNumber, toBlock} = await this.getFromToBlock();
        const events = await this.ethBridgeContract.getEvent(startBlockNumber, toBlock);
        for (const event of events) {
          switch (event.event) {
            case 'Lock':
              await this.handlerLockEvent(event, queryRunner);
              break;
            case 'Unlock':
              await this.handlerUnLockEvent(event, queryRunner)
              break;
            default:
              continue;
          }
        }
        console.log(
          `[handleCrawlETHBridge] Crawled from ${startBlockNumber} to ${toBlock}`,
        );
        await this.updateLatestBlockCrawl(toBlock, queryRunner)
        return await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
    }
  }

  private async handlerLockEvent(
    event: EventData,
    queryRunner: QueryRunner,
  ) {
    const blockTimeOfBlockNumber = await this.ethBridgeContract.getBlockTimeByBlockNumber(event.blockNumber)    
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
      protocolFee: event.returnValues.fee,
      tokenReceivedName: "ETH",
    });
  }

  private async updateLatestBlockCrawl(blockNumber: number, queryRunner: QueryRunner) {
    await queryRunner.manager.update(CrawlContract, 
      {
        contractAddress: this.configService.get(EEnvKey.ETH_BRIDGE_CONTRACT_ADDRESS),
        networkName: ENetworkName.ETH
      }, {
        latestBlock: blockNumber
      })
  }

  private async getFromToBlock(): Promise<{startBlockNumber, toBlock}> {

    let startBlockNumber = this.ethBridgeContract.getStartBlock();
    let toBlock = await this.ethBridgeContract.getBlockNumber();

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
  
    if (toBlock >= Number(startBlockNumber) + Number(this.numberOfBlockPerJob)) {
      toBlock = Number(startBlockNumber) + this.numberOfBlockPerJob;
    }

    return {startBlockNumber, toBlock }
  }
}
