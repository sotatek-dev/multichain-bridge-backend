import { EntityRepository } from 'nestjs-typeorm-custom-repository';
import { Brackets } from 'typeorm';

import { EDirection } from '../../constants/api.constant.js';
import { EEventStatus, ENetworkName } from '../../constants/blockchain.constant.js';
import { ETableName } from '../../constants/entity.constant.js';
import { MAX_RETRIES } from '../../constants/service.constant.js';
import { BaseRepository } from '../../core/base-repository.js';
import { EventLog } from '../../modules/crawler/entities/event-logs.entity.js';
import { IJobUnlockPayload } from '../../modules/crawler/interfaces/job.interface.js';
import { GetHistoryDto, GetHistoryOfUserDto } from '../../modules/users/dto/history-response.dto.js';
import { endOfDayUnix, nowUnix, startOfDayUnix } from '../../shared/utils/time.js';

@EntityRepository(EventLog)
export class EventLogRepository extends BaseRepository<EventLog> {
  protected alias: ETableName = ETableName.EVENT_LOGS;

  public async getEventLockWithNetwork(network: ENetworkName, threshold?: number): Promise<EventLog | null> {
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
  public async getPendingTx(
    network: ENetworkName,
    isSignatureFullFilled: boolean,
    numOfSignaturesNeeded: number,
  ): Promise<Array<IJobUnlockPayload>> {
    const currentUnixTimestamp = nowUnix();
    const qb = this.createQueryBuilder(`${this.alias}`);
    qb.select([
      `${this.alias}.id as "eventLogId"`,
      `${this.alias}.network_received as "network"`,
      `${this.alias}.sender_address as "senderAddress"`,
    ]);
    qb.leftJoin(`${this.alias}.validator`, 'signature');

    qb.where(`${this.alias}.network_received = :network`, { network });

    qb.andWhere(`${this.alias}.status IN (:...status)`, {
      status: isSignatureFullFilled ? [EEventStatus.WAITING, EEventStatus.FAILED] : [EEventStatus.WAITING], //  EEventStatus.PROCESSING add in future
    })
      .andWhere(`${this.alias}.retry < :retryNumber`, { retryNumber: MAX_RETRIES })
      .orderBy(`${this.alias}.id`, EDirection.DESC)
      .groupBy(`${this.alias}.id`)
      .addGroupBy(`${this.alias}.network_received`)
      .addGroupBy(`${this.alias}.sender_address`);
    if (isSignatureFullFilled) {
      qb.andWhere(`${this.alias}.next_send_tx_job_time < :currentUnixTimestamp`, { currentUnixTimestamp });
      qb.having(`COUNT(signature.id) = :numOfSignaturesNeeded`, { numOfSignaturesNeeded });
    } else {
      qb.andWhere(`${this.alias}.next_validate_signature_job_time < :currentUnixTimestamp`, { currentUnixTimestamp });
      qb.having(`COUNT(signature.id) < :numOfSignaturesNeeded`, { numOfSignaturesNeeded });
    }
    qb.orderBy(`${this.alias}.id`, 'ASC')
    return qb.getRawMany();
  }

  public async updateStatusAndRetryEvenLog({
    id,
    ...updateData
  }: {
    id: number;
    status: EEventStatus;
    amountReceived?: string;
    protocolFee?: string;
    errorDetail?: string;
    txHashUnlock?: string;
    gasFee?: string;
    tip?: string;
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

  public async getHistoriesOfUser(address: string, options: GetHistoryOfUserDto) {
    const queryBuilder = this.createQb();
    queryBuilder
      .where(`LOWER(${this.alias}.sender_address) = :address OR LOWER(${this.alias}.receive_address) = :address`, {
        address: address.toLowerCase(),
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
        `${this.alias}.tip`,
        `${this.alias}.gasFee`,
        `${this.alias}.status`,
        `${this.alias}.createdAt`,
        `${this.alias}.updatedAt`,
      ]);

    this.queryBuilderAddPagination(queryBuilder, options);
    return queryBuilder.getManyAndCount();
  }

  public async getHistories(options: GetHistoryDto) {
    const queryBuilder = this.createQb();
    queryBuilder.orderBy(`${this.alias}.id`, EDirection.DESC);
    if (typeof options.address === 'string') {
      queryBuilder.andWhere(
        `${this.alias}.sender_address ilike :address OR ${this.alias}.receive_address ilike :address`,
        {
          address: `%${options.address.toLowerCase()}%`,
        },
      );
    }

    this.queryBuilderAddPagination(queryBuilder, options);
    return queryBuilder.getManyAndCount();
  }

  public async sumAmountBridgeOfUserInDay(address: string): Promise<{ totalamount: string }> {
    const qb = this.createQb();
    qb.select([`${this.alias}.sender_address`, `SUM(CAST(${this.alias}.amount_from as DECIMAL(100,2))) as totalamount`])
      .where(`${this.alias}.sender_address = :address`, { address })
      .andWhere(`${this.alias}.block_time_lock BETWEEN ${startOfDayUnix(new Date())} AND ${endOfDayUnix(new Date())}`)
      .groupBy(`${this.alias}.sender_address`);
    return qb.getRawOne() as any;
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

  async getTotalAmoutFromNetworkReceived(
    networkReceived: ENetworkName,
  ): Promise<{ amountFromTotal: string; amountReceivedTotal: string }> {
    const qb = this.createQb();

    qb.select([
      'sum(CAST(amount_from as INT8)) as "amountFromTotal"',
      'sum(CAST(amount_received as INT8)) as "amountReceivedTotal"',
    ]);

    qb.where('status = :status', { status: EEventStatus.COMPLETED });
    qb.andWhere('network_received = :networkReceived', { networkReceived });

    return qb.getRawOne() as any;
  }
  async getNumOfPendingTx(): Promise<{ network: ENetworkName; count: string }[]> {
    const qb = this.createQb();
    qb.select(['network_received as network', 'count(1)']);
    qb.where("status = 'waiting'");
    qb.groupBy('network_received');
    return qb.getRawMany();
  }
}
