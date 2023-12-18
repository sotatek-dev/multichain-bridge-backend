import { ConfigService } from '@nestjs/config';
import { Command, Console } from 'nestjs-console';

import { EEnvKey } from '@constants/env.constant';
import { BlockchainEVMCrawler } from './crawler.evmbridge';
import { SenderEVMBridge } from './sender.evmbridge';
import { sleep } from '@shared/utils/promise';

@Console()
export class CrawlerConsole {
  private readonly numberOfBlockPerJob: number;

  constructor(
    private readonly configService: ConfigService,
    private blockchainEVMCrawler: BlockchainEVMCrawler,
    private senderEVMBridge: SenderEVMBridge,

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

  @Command({
    command: 'sender-eth-bridge-unlock',
    description: 'sender ETH Bridge unlock',
  })
  async handleSenderETHBridgeUnlock() {
    try {
      while (true) {
        this.senderEVMBridge.handleUnlockEVM();
        await sleep(15);
      }
    } catch (error) {
      console.log(error);
    }
  }
}
