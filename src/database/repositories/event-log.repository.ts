import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '@constants/entity.constant';

import { BaseRepository } from '@core/base-repository';

import { EventLog } from '@modules/crawler/entities';

@EntityRepository(EventLog)
export class EventLogRepository extends BaseRepository<EventLog> {
  protected alias: ETableName = ETableName.CRAWL_CONTRACTS;
}
