import { EntityRepository } from 'nestjs-typeorm-custom-repository';
import { Brackets } from 'typeorm';

import { EDirection } from '../../constants/api.constant.js';
import { EEventStatus, ENetworkName } from '../../constants/blockchain.constant.js';
import { ETableName } from '../../constants/entity.constant.js';
import { MAX_RETRIES } from '../../constants/service.constant.js';
import { BaseRepository } from '../../core/base-repository.js';
import { EventLog } from '../../modules/crawler/entities/event-logs.entity.js';
import { endOfDayUnix, startOfDayUnix } from '../../shared/utils/time.js';

@EntityRepository(EventLog)
export class EventLogRepository extends BaseRepository<EventLog> {
  protected alias: ETableName = ETableName.EVENT_LOGS;

  public async getEventLockWithNetwork(network: ENetworkName, threshold?: number): Promise<EventLog> {
    const qb = this.createQueryBuilder(`${this.alias}`);
    qb.innerJoinAndSelect(`${this.alias}.validator`, 'signature');

    qb.where(`${this.alias}.networkReceived = :network`, { network });

    if (threshold) {
      qb.andWhere(
        `(SELECT COUNT(${ETableName.MULTI_SIGNATURE}.id) 
          FROM  ${ETableName.MULTI_SIGNATURE} 
          WHERE ${ETableName.MULTI_SIGNATURE}.tx_id = ${this.alias}.id 
          AND   ${ETableName.MULTI_SIGNATURE}.signature IS NOT NULL)  >= :threshold  `,
        {
          threshold,
        },
      );
    }
    qb.andWhere(`${this.alias}.status IN (:...status)`, { status: [EEventStatus.WAITING, EEventStatus.FAILED] })
      .andWhere(`${this.alias}.retry < :retryNumber`, { retryNumber: MAX_RETRIES })
      .orderBy(`${this.alias}.status`, EDirection.DESC)
      .addOrderBy(`${this.alias}.id`, EDirection.ASC)
      .addOrderBy(`${this.alias}.retry`, EDirection.ASC);

    return qb.getOne();
  }

  public async updateStatusAndRetryEvenLog({
    id,
    ...updateData
  }: {
    id: number;
    retry: number;
    status: EEventStatus;
    amountReceived?: string;
    protocolFee?: string;
    errorDetail?: string;
    txHashUnlock?: string;
  }) {
    return this.createQueryBuilder(`${this.alias}`)
      .update(EventLog)
      .set(updateData)
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

  async getValidatorPendingSignature(validator: string, network: ENetworkName) {
    const qb = this.createQueryBuilder(`${this.alias}`);
    qb.leftJoinAndSelect(`${this.alias}.validator`, 'signature');
    qb.where(`${this.alias}.networkReceived = :network`, { network });
    qb.andWhere(
      new Brackets(qb => {
        qb.where(`signature.validator IS NULL`)
          .orWhere(`signature.validator != :validator`, { validator })
          .orWhere(
            new Brackets(qb => {
              qb.where(`signature.signature IS NULL`).andWhere(`signature.retry < ${MAX_RETRIES}`);
            }),
          );
      }),
    );
    qb.andWhere(`${this.alias}.status = :status`, { status: EEventStatus.WAITING })
      .addOrderBy(`${this.alias}.id`, EDirection.ASC)
      .addOrderBy(`${this.alias}.retry`, EDirection.ASC);

    return qb.getOne();
  }
}
