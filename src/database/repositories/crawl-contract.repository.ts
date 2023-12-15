import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '@constants/entity.constant';

import { BaseRepository } from '@core/base-repository';

import { CrawlContract } from '@modules/crawler/entities';

@EntityRepository(CrawlContract)
export class CrawlContractRepository extends BaseRepository<CrawlContract> {
  protected alias: ETableName = ETableName.CRAWL_CONTRACTS;
}
