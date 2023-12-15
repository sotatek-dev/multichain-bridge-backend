import { Module } from '@nestjs/common';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { CrawlerConsole } from './crawler.console';
import { CrawlerService } from './crawler.service';
import { BlockchainEVMCrawler } from './crawler.evmbridge';

@Module({
  imports: [CustomRepositoryModule.forFeature([CrawlContractRepository, EventLogRepository])],
  providers: [CrawlerConsole, CrawlerService, BlockchainEVMCrawler],
  exports: [CrawlerService],
})
export class CrawlerModule {}