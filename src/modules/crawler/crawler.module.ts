import { Module } from '@nestjs/common';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { MultiSignatureRepository } from 'database/repositories/multi-signature.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { BatchJobGetPriceToken } from './batch.tokenprice';
import { CrawlerConsole } from './crawler.console';
import { BlockchainEVMCrawler } from './crawler.evmbridge';
import { SCBridgeMinaCrawler } from './crawler.minabridge';
import { CrawlerService } from './crawler.service';
import { SenderEVMBridge } from './sender.evmbridge';
import { SenderMinaBridge } from './sender.minabridge';

@Module({
  imports: [
    CustomRepositoryModule.forFeature([
      CrawlContractRepository,
      EventLogRepository,
      CommonConfigRepository,
      TokenPairRepository,
      TokenPriceRepository,
      MultiSignatureRepository,
    ]),
  ],
  providers: [
    CrawlerConsole,
    CrawlerService,
    BlockchainEVMCrawler,
    SenderEVMBridge,
    SCBridgeMinaCrawler,
    SenderMinaBridge,
    BatchJobGetPriceToken,
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {}
