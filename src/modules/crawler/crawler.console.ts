import { ConfigService } from '@nestjs/config';
import { Logger } from 'log4js';
import { Command, Console } from 'nestjs-console';

import { EEnvKey } from '@constants/env.constant';

import { LoggerService } from '@shared/modules/logger/logger.service';
import { sleep } from '@shared/utils/promise';

import { BatchJobGetPriceToken } from './batch.tokenprice';
import { BlockchainEVMCrawler } from './crawler.evmbridge';
import { SCBridgeMinaCrawler } from './crawler.minabridge';
import { SenderEVMBridge } from './sender.evmbridge';
import { SenderMinaBridge } from './sender.minabridge';

@Console()
export class CrawlerConsole {
  private readonly numberOfBlockPerJob: number;
  private readonly logger: Logger;
  constructor(
    private readonly configService: ConfigService,
    private blockchainEVMCrawler: BlockchainEVMCrawler,
    private scBridgeMinaCrawler: SCBridgeMinaCrawler,
    private senderEVMBridge: SenderEVMBridge,
    private senderMinaBridge: SenderMinaBridge,
    private jobGetPrice: BatchJobGetPriceToken,
    private loggerService: LoggerService,
  ) {
    this.numberOfBlockPerJob = +this.configService.get<number>(EEnvKey.NUMBER_OF_BLOCK_PER_JOB);
    this.logger = loggerService.getLogger('CRAWLER_CONSOLE');
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
      this.logger.error(error);
    }
  }

  @Command({
    command: 'validate-eth-bridge-unlock',
    description: 'validate ETH Bridge unlock',
  })
  async handleValidateMinaLockTx() {
    try {
      while (true) {
        this.senderEVMBridge.handleValidateUnlockTxEVM();
        await sleep(15);
      }
    } catch (error) {
      this.logger.error(error);
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
      this.logger.error(error);
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
      this.logger.error(error);
    }
  }

  @Command({
    command: 'crawl-mina-token-contract',
    description: 'crawl Mina Token Contract',
  })
  async handleCrawlMinaToken() {
    try {
      while (true) {
        await sleep(15);
      }
    } catch (error) {
      this.logger.error(error);
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
        await sleep(3);
      }
    } catch (error) {
      this.logger.error(error);
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
      this.logger.error(error);
    }
  }
}
