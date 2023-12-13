import { Module } from '@nestjs/common';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { CrawlerConsole } from './crawler.console';
import { CrawlerService } from './crawler.service';

@Module({
  imports: [CustomRepositoryModule.forFeature([CrawlContractRepository, EventLogRepository])],
  providers: [CrawlerConsole, CrawlerService],
  exports: [CrawlerService],
})
export class CrawlerModule {}
