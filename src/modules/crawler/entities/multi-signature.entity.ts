import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { ENetworkName } from '@constants/blockchain.constant';
import { ETableName } from '@constants/entity.constant';

import { BaseEntityIncludeTime } from '@core/base.entity';

import { EventLog } from './event-logs.entity';

@Entity(ETableName.MULTI_SIGNATURE)
export class MultiSignature extends BaseEntityIncludeTime {
  @Column({ name: 'validator', type: 'varchar', nullable: true })
  validator: string;

  @Column({ name: 'tx_id', type: 'bigint', nullable: true })
  txId: number;

  @Column({ name: 'retry', type: 'bigint', nullable: true })
  retry: number;

  @Column({ name: 'signature', type: 'text', nullable: true })
  signature: string;

  @Column({ name: 'error_code', type: 'text', nullable: true })
  errorCode: string | unknown;

  @Column({ name: 'chain', type: 'varchar', enum: ENetworkName, nullable: true })
  chain: ENetworkName;

  @ManyToOne<EventLog>(() => EventLog, eventLog => eventLog.validator, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tx_id' })
  transaction: EventLog;

  constructor(value: Partial<MultiSignature>) {
    super();
    Object.assign(this, value);
  }
}
