import { Module } from '@nestjs/common';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { CrawlerConsole } from './crawler.console';
import { CrawlerService } from './crawler.service';
import { BlockchainEVMCrawler } from './crawler.evmbridge';
import { BlockchainMinaCrawler } from './crawler.minabridge';
import { SenderEVMBridge } from './sender.evmbridge';
import { SenderMinaBridge } from './sender.minabridge'

@Module({
  imports: [CustomRepositoryModule.forFeature([CrawlContractRepository, EventLogRepository])],
  providers: [CrawlerConsole, CrawlerService, BlockchainEVMCrawler, SenderEVMBridge, BlockchainMinaCrawler, SenderMinaBridge],
  exports: [CrawlerService],
})
export class CrawlerModule {}