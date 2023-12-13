import { ConfigService } from '@nestjs/config';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { Command, Console } from 'nestjs-console';

import { EEventName, EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';

import { ETHBridgeContract } from '@shared/modules/web3/web3.service';
import { sleep } from '@shared/utils/promise';

@Console()
export class CrawlerConsole {
  private readonly numberOfBlockPerJob: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly ethBridgeContract: ETHBridgeContract,
    private readonly crawlContractRepository: CrawlContractRepository,
    private readonly eventLogRepository: EventLogRepository,
  ) {
    this.numberOfBlockPerJob = +this.configService.get<number>(EEnvKey.NUMBER_OF_BLOCK_PER_JOB);
  }

  @Command({
    command: 'crawl-eth-bridge',
    description: 'Crawl ETH Bridge contract',
  })
  async handleCrawlETHBridge() {
    while (true) {
      try {
        let startBlockNumber = this.ethBridgeContract.getStartBlock();
        const latestBlock = await this.ethBridgeContract.getBlockNumber();
        let currentCrawledBlock = await this.crawlContractRepository.findOne({
          where: { networkName: ENetworkName.ETH },
        });

        if (!currentCrawledBlock) {
          const tmpData = this.crawlContractRepository.create({
            contractAddress: this.ethBridgeContract.getContractAddress(),
            networkName: ENetworkName.ETH,
            latestBlock: startBlockNumber.toString(),
          });
          currentCrawledBlock = await this.crawlContractRepository.save(tmpData);
        } else {
          startBlockNumber = parseInt(currentCrawledBlock.latestBlock) + 1;
        }

        if (latestBlock >= startBlockNumber + this.numberOfBlockPerJob) {
          const toBlock = startBlockNumber + this.numberOfBlockPerJob;
          const events = await this.ethBridgeContract.getEvent(startBlockNumber, toBlock);
          for (const event of events) {
            if (event?.event === EEventName.LOCK) {
              const tmpData = this.eventLogRepository.create({
                senderAddress: event.returnValues.receiver,
                txHashLock: event.transactionHash,
                networkName: ENetworkName.ETH,
                blockNumber: event.blockNumber.toString(),
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
          console.log(
            `[handleCrawlETHBridge] Crawled from ${startBlockNumber} to ${toBlock}, lastest block: ${latestBlock}`,
          );
          currentCrawledBlock.latestBlock = toBlock.toString();
          await this.crawlContractRepository.save(currentCrawledBlock);
        } else {
          console.log(
            `[handleCrawlETHBridge] startBlockNumber: ${startBlockNumber}, latestBlockNumber: ${latestBlock}. Waiting for enough batch...`,
          );
          await sleep(5);
        }
      } catch (e) {
        console.error('[handleCrawlETHBridge]', e);
      }
    }
  }
}
