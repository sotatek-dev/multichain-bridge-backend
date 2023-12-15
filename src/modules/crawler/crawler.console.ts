import { ConfigService } from '@nestjs/config';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { Command, Console } from 'nestjs-console';

import { EEnvKey } from '@constants/env.constant';

import { ETHBridgeContract } from '@shared/modules/web3/web3.service';
import { BlockchainEVMCrawler } from './crawler.evmbridge';
import { sleep } from '@shared/utils/promise';

@Console()
export class CrawlerConsole {
  private readonly numberOfBlockPerJob: number;

  constructor(
    private readonly configService: ConfigService,
    private blockchainEVMCrawler: BlockchainEVMCrawler,

  ) {
    this.numberOfBlockPerJob = +this.configService.get<number>(EEnvKey.NUMBER_OF_BLOCK_PER_JOB);
  }

  @Command({
    command: 'crawl-eth-bridge',
    description: 'Crawl ETH Bridge contract',
  })
  async handleCrawlETHBridge() {
    try {
      while (true) {
        this.blockchainEVMCrawler.handleEventCrawlBlock();
        await sleep(15);
      }
    } catch (error) {
      console.log(error);
      
    }
  }
}
