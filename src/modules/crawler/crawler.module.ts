import { Module } from '@nestjs/common';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { CrawlContractRepository } from '../../database/repositories/crawl-contract.repository.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { MultiSignatureRepository } from '../../database/repositories/multi-signature.repository.js';
import { TokenPairRepository } from '../../database/repositories/token-pair.repository.js';
import { TokenPriceRepository } from '../../database/repositories/token-price.repository.js';
import { BatchJobGetPriceToken } from './batch.tokenprice.js';
import { CrawlerConsole } from './crawler.console.js';
import { BlockchainEVMCrawler } from './crawler.evmbridge.js';
import { SCBridgeMinaCrawler } from './crawler.minabridge.js';
import { JobUnlockProvider } from './job-unlock.provider.js';
import { SenderEVMBridge } from './sender.evmbridge.js';
import { SenderMinaBridge } from './sender.minabridge.js';
import { POASync } from './services/token-poa-sync.service.js';

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
    BlockchainEVMCrawler,
    SenderEVMBridge,
    SCBridgeMinaCrawler,
    SenderMinaBridge,
    BatchJobGetPriceToken,
    JobUnlockProvider,
    POASync,
  ],
})
export class CrawlerModule {}
