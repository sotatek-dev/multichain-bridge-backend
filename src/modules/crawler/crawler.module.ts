import { Module } from '@nestjs/common';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { CrawlerService } from './crawler.service';

@Module({
  imports: [CustomRepositoryModule.forFeature([CrawlContractRepository, EventLogRepository])],
  providers: [CrawlerService],
  exports: [CrawlerService],
})
export class CrawlerModule {}
