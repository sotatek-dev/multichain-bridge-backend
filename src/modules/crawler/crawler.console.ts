import { ConfigService } from '@nestjs/config';
import { Logger } from 'log4js';
import { Command, Console } from 'nestjs-console';

import { EEnvKey } from '../../constants/env.constant.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { sleep } from '../../shared/utils/promise.js';
import { BatchJobGetPriceToken } from './batch.tokenprice.js';
import { BlockchainEVMCrawler } from './crawler.evmbridge.js';
import { SCBridgeMinaCrawler } from './crawler.minabridge.js';
import { SenderEVMBridge } from './sender.evmbridge.js';
import { SenderMinaBridge } from './sender.minabridge.js';

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
        await this.blockchainEVMCrawler.handleEventCrawlBlock();
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
  async handleValidateEthLockTx() {
    try {
      while (true) {
        await this.senderEVMBridge.unlockEVMTransaction();
        await sleep(15);
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Command({
    command: 'validate-mina-bridge-unlock',
    description: 'validate MINA Bridge unlock',
  })
  async handleValidateMinaLockTx() {
    try {
      while (true) {
        await this.senderMinaBridge.handleValidateUnlockTxMina();
        await sleep(1);
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
        await this.senderEVMBridge.handleUnlockEVM();
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
        await this.scBridgeMinaCrawler.handleEventCrawlBlock();
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
}
