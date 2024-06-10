import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { EDirection } from '@constants/api.constant';
import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { ETableName } from '@constants/entity.constant';

import { BaseRepository } from '@core/base-repository';

import { EventLog } from '@modules/crawler/entities';

import { endOfDayUnix, startOfDayUnix } from '@shared/utils/time';

@EntityRepository(EventLog)
export class EventLogRepository extends BaseRepository<EventLog> {
  protected alias: ETableName = ETableName.EVENT_LOGS;

  public async getEventLockWithNetwork(network: ENetworkName): Promise<EventLog> {
    return this.createQueryBuilder(`${this.alias}`)
      .where(`${this.alias}.networkReceived = :network`, { network })
      .andWhere(`${this.alias}.status IN (:...status)`, { status: [EEventStatus.WAITING, EEventStatus.FAILED] })
      .andWhere(`${this.alias}.retry < :retryNumber`, { retryNumber: 3 })
      .orderBy(`${this.alias}.status`, EDirection.DESC)
      .addOrderBy(`${this.alias}.id`, EDirection.ASC)
      .addOrderBy(`${this.alias}.retry`, EDirection.ASC)
      .getOne();
  }

  public async updateStatusAndRetryEvenLog(
    id: number,
    retry: number,
    status: EEventStatus,
    errorDetail?,
    txHashUnlock?,
    protocolFee?,
  ) {
    return this.createQueryBuilder(`${this.alias}`)
      .update(EventLog)
      .set({
        status,
        retry,
        errorDetail,
        txHashUnlock,
        protocolFee,
      })
      .where(`${this.alias}.id = :id`, { id })
      .execute();
  }

  public async updateLockEvenLog(id: number, status: EEventStatus) {
    return this.createQueryBuilder(`${this.alias}`)
      .update(EventLog)
      .set({
        status,
      })
      .where(`${this.alias}.id = :id`, { id })
      .execute();
  }

  public async getHistoriesOfUser(address: string, options) {
    const queryBuilder = this.createQb();
    queryBuilder
      .where(`${this.alias}.sender_address = :address`, { address })
      .andWhere(`${this.alias}.status IN (:...status)`, {
        status: [EEventStatus.PROCESSING, EEventStatus.WAITING, EEventStatus.COMPLETED],
      })
      .orderBy(`${this.alias}.id`, EDirection.DESC)
      .select([
        `${this.alias}.id`,
        `${this.alias}.senderAddress`,
        `${this.alias}.tokenFromAddress`,
        `${this.alias}.amountFrom`,
        `${this.alias}.networkFrom`,
        `${this.alias}.tokenFromName`,
        `${this.alias}.txHashLock`,
        `${this.alias}.receiveAddress`,
        `${this.alias}.amountReceived`,
        `${this.alias}.tokenReceivedAddress`,
        `${this.alias}.networkReceived`,
        `${this.alias}.tokenReceivedName`,
        `${this.alias}.txHashUnlock`,
        `${this.alias}.blockNumber`,
        `${this.alias}.blockTimeLock`,
        `${this.alias}.protocolFee`,
        `${this.alias}.fromTokenDecimal`,
        `${this.alias}.toTokenDecimal`,
        `${this.alias}.status`,
        `${this.alias}.createdAt`,
      ]);

    this.queryBuilderAddPagination(queryBuilder, options);
    return queryBuilder.getManyAndCount();
  }

  public async getHistories(options) {
    const queryBuilder = this.createQb();
    queryBuilder
      .andWhere(`${this.alias}.status IN (:...status)`, { status: [EEventStatus.PROCESSING, EEventStatus.WAITING] })
      .orderBy(`${this.alias}.id`, EDirection.DESC);
    if (options.address) {
      queryBuilder.andWhere(`${this.alias}.sender_address = :address`, { address: options.address });
    }

    this.queryBuilderAddPagination(queryBuilder, options);
    return queryBuilder.getManyAndCount();
  }

  public async sumAmountBridgeOfUserInDay(address) {
    const qb = this.createQb();
    qb.select([`${this.alias}.sender_address`, `SUM(CAST(${this.alias}.amount_from as DECIMAL(100,2))) as totalamount`])
      .where(`${this.alias}.sender_address = :address`, { address })
      .andWhere(`${this.alias}.block_time_lock BETWEEN ${startOfDayUnix(new Date())} AND ${endOfDayUnix(new Date())}`)
      .groupBy(`${this.alias}.sender_address`);
    return qb.getRawOne();
  }
}
