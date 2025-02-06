import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '../../constants/entity.constant.js';
import { BaseRepository } from '../../core/base-repository.js';
import { CrawlContract } from '../../modules/crawler/entities/index.js';

@EntityRepository(CrawlContract)
export class CrawlContractRepository extends BaseRepository<CrawlContract> {
  protected alias: ETableName = ETableName.CRAWL_CONTRACTS;
}
