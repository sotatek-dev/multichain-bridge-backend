import { ConfigService } from '@nestjs/config';
import { Command, Console } from 'nestjs-console';

import { EEnvKey } from '@constants/env.constant';
import { BlockchainEVMCrawler } from './crawler.evmbridge';
import { SenderEVMBridge } from './sender.evmbridge';
import { SenderMinaBridge } from './sender.minabridge';
import { SCBridgeMinaCrawler } from './crawler.minabridge';
import { SCTokenMinaCrawler } from './crawler.minatoken';
import { sleep } from '@shared/utils/promise';
import { BatchJobGetPriceToken } from './batch.tokenprice';

@Console()
export class CrawlerConsole {
  private readonly numberOfBlockPerJob: number;

  constructor(
    private readonly configService: ConfigService,
    private blockchainEVMCrawler: BlockchainEVMCrawler,
    private scBridgeMinaCrawler: SCBridgeMinaCrawler,
    private scTokenMinaCrawler: SCTokenMinaCrawler,
    private senderEVMBridge: SenderEVMBridge,
    private senderMinaBridge: SenderMinaBridge,
    private jobGetPrice: BatchJobGetPriceToken,

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
        this.scBridgeMinaCrawler.handleEventCrawlBlock();
        await sleep(15);
      }
    } catch (error) {
      console.log(error);
    }
  }

  @Command({
    command: 'crawl-mina-token-contract',
    description: 'crawl Mina Token Contract',
  })
  async handleCrawlMinaToken() {
    try {
      while (true) {
        this.scTokenMinaCrawler.handleEventCrawlBlock();
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
        await this.senderMinaBridge.handleUnlockMina();
        await sleep(15);
      }
    } catch (error) {
      console.log(error);
    }
  }

  @Command({
    command: 'get-price-token',
    description: 'get price of token',
  })
  async getPriceCoinMarketCap() {
    try {
      while (true) {
        this.jobGetPrice.handleGetPriceToken();
        await sleep(43200);
      }
    } catch (error) {
      console.log(error);
    }
  }
}
