import { Module } from '@nestjs/common';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';

import { CrawlerConsole } from './crawler.console';
import { CrawlerService } from './crawler.service';
import { BlockchainEVMCrawler } from './crawler.evmbridge';
import { SCBridgeMinaCrawler } from './crawler.minabridge';
import { SenderEVMBridge } from './sender.evmbridge';
import { SenderMinaBridge } from './sender.minabridge'
import { BatchJobGetPriceToken } from './batch.tokenprice';

@Module({
  imports: [CustomRepositoryModule.forFeature([
    CrawlContractRepository, EventLogRepository,
    CommonConfigRepository, TokenPairRepository, TokenPriceRepository])],
  providers: [CrawlerConsole, CrawlerService, BlockchainEVMCrawler,
    SenderEVMBridge, SCBridgeMinaCrawler, SenderMinaBridge, BatchJobGetPriceToken
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {}