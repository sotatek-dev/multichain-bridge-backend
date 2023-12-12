import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { AbiItem } from 'web3-utils';

import { EEventName, EEventStatus, ENetworkName } from '@constants/blockchain.constant';

import { web3 } from '@shared/utils/web3';

import { CrawlContractRepository } from './../../database/repositories/crawl-contract.repository';
import ContractETHAbi from './contract/ContractETH.abi.json';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly startBlock: number;
  private readonly numberOfBlockPerJob: number;
  private readonly contractAddressETH: string;
  constructor(
    private readonly crawlContractRepository: CrawlContractRepository,
    private readonly eventLogRepository: EventLogRepository,
  ) {
    this.startBlock = parseInt(process.env.START_BLOCK_ETH);
    this.numberOfBlockPerJob = parseInt(process.env.NUMBER_OF_BLOCK_PER_JOB);
    this.contractAddressETH = process.env.CONTRACT_ADDRESS_ETH;
  }

  @Cron('*/4 * * * * *')
  async handleCrawl() {
    try {
      let startBlockNumber = this.startBlock;
      const latestBlock = await web3.eth.eth.getBlockNumber();
      const contract = new web3.eth.eth.Contract(ContractETHAbi as AbiItem[], this.contractAddressETH);
      let currentCrawledBlock = await this.crawlContractRepository.findOne({
        where: { networkName: ENetworkName.ETH },
      });

      if (!currentCrawledBlock) {
        const tmpData = this.crawlContractRepository.create({
          contractAddress: this.contractAddressETH,
          networkName: ENetworkName.ETH,
          latestBlock: this.startBlock,
        });
        currentCrawledBlock = await this.crawlContractRepository.save(tmpData);
      } else {
        startBlockNumber = currentCrawledBlock.latestBlock + 1;
      }

      if (latestBlock >= startBlockNumber + this.numberOfBlockPerJob) {
        const toBlock = startBlockNumber + this.numberOfBlockPerJob;
        const events = await contract.getPastEvents('allEvents', {
          fromBlock: startBlockNumber,
          toBlock: toBlock,
        });
        for (const event of events) {
          if (event?.event === EEventName.LOCK) {
            const tmpData = this.eventLogRepository.create({
              senderAddress: event.returnValues.receiver,
              txHashLock: event.transactionHash,
              networkName: ENetworkName.ETH,
              blockNumber: event.blockNumber,
              event: event.event,
              returnValues: JSON.stringify(event.returnValues),
              status: EEventStatus.WAITING,
              retry: 0,
            });
            await this.eventLogRepository.save(tmpData);
          } else if (event?.event === EEventName.UNLOCK) {
            const tmpData = await this.eventLogRepository.findOne({
              where: { txHashLock: event.returnValues.hash },
            });
            if (tmpData) {
              tmpData.txHashUnlock = event.transactionHash;
              tmpData.status = EEventStatus.DONE;
              await this.eventLogRepository.save(tmpData);
            }
          }
        }
        this.logger.log(`Crawled from ${startBlockNumber} to ${toBlock}, lastest block: ${latestBlock}`);
        currentCrawledBlock.latestBlock = toBlock;
        await this.crawlContractRepository.save(currentCrawledBlock);
      }
    } catch (e) {
      this.logger.error(e);
    }
  }
}
