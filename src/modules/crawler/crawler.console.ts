import { ConfigService } from '@nestjs/config';
import { Command, Console } from 'nestjs-console';

import { EEnvKey } from '@constants/env.constant';
import { BlockchainEVMCrawler } from './crawler.evmbridge';
import { SenderEVMBridge } from './sender.evmbridge';
import { SenderMinaBridge } from './sender.minabridge';
import { BlockchainMinaCrawler } from './crawler.minabridge';
import { sleep } from '@shared/utils/promise';

@Console()
export class CrawlerConsole {
  private readonly numberOfBlockPerJob: number;

  constructor(
    private readonly configService: ConfigService,
    private blockchainEVMCrawler: BlockchainEVMCrawler,
    private blockchainMinaCrawler: BlockchainMinaCrawler,
    private senderEVMBridge: SenderEVMBridge,
    private senderMinaBridge: SenderMinaBridge,

  ) {
    this.numberOfBlockPerJob = +this.configService.get<number>(EEnvKey.NUMBER_OF_BLOCK_PER_JOB);
  }

  @Command({
    command: 'crawl-eth-bridge-contract',
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

  @Command({
    command: 'crawl-mina-bridge-contract',
    description: 'crawl Mina Bridge Contract',
  })
  async handleCrawlMinaBridge() {
    try {
      while (true) {
        this.blockchainMinaCrawler.handleEventCrawlBlock();
        await sleep(15);
      }
    } catch (error) {
      console.log(error);
    }
  }

  @Command({
    command: 'sender-mina-bridge-unlock',
    description: 'sender Mina Bridge unlock',
  })
  async handleSenderMinaBridgeUnlock() {
    try {
      while (true) {
        this.senderMinaBridge.handleUnlockMina();
        await sleep(15);
      }
    } catch (error) {
      console.log(error);
    }
  }
}
