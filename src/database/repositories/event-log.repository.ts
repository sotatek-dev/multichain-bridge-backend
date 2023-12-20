import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '@constants/entity.constant';
import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EDirection } from '@constants/api.constant';

import { BaseRepository } from '@core/base-repository';

import { EventLog } from '@modules/crawler/entities';

@EntityRepository(EventLog)
export class EventLogRepository extends BaseRepository<EventLog> {
  protected alias: ETableName = ETableName.EVENT_LOGS;

  public async getEventLockWithNetwork(network: ENetworkName): Promise<EventLog> {
    return this.createQueryBuilder(`${this.alias}`)
    .where(`${this.alias}.networkReceived = :network`, { network,})
    .andWhere(`${this.alias}.status IN (:...status)`, { status: [EEventStatus.WAITING, EEventStatus.FAILED] })
    .andWhere(`${this.alias}.retry < :retryNumber`, { retryNumber: 3 })
    .orderBy(`${this.alias}.id`, EDirection.ASC)
    .addOrderBy(`${this.alias}.retry`, EDirection.ASC)
    .getOne();
  }

  public async updateStatusAndRetryEvenLog(id: number, retry: number, status: EEventStatus) {
    return this.createQueryBuilder(`${this.alias}`)
    .update(EventLog)
    .set({
      status,
      retry
    })
    .where(`${this.alias}.id = :id`, { id })
    .execute()
  }

  public async getHistoriesOfUser(address: string, options) {
    const queryBuilder = this.createQb();
    queryBuilder
    .where(`${this.alias}.sender_address = :address`, { address})
    this.queryBuilderAddPagination(queryBuilder, options);
    return queryBuilder.getManyAndCount();
  }

  public async getHistories(options) {
    const queryBuilder = this.createQb();
    queryBuilder
    .andWhere(`${this.alias}.status IN (:...status)`, { status: [EEventStatus.PROCESSING, EEventStatus.FAILED] })
    if(options.address) {
      queryBuilder
      .andWhere(`${this.alias}.sender_address = :address`, { address: options.address})
    }

    this.queryBuilderAddPagination(queryBuilder, options);
    return queryBuilder.getManyAndCount();
  }
}
