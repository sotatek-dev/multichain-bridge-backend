import { Column, Entity } from 'typeorm';

import { EEventName, ENetworkName } from '@constants/blockchain.constant';
import { ETableName } from '@constants/entity.constant';

import { BaseEntityIncludeTime } from '@core/base.entity';

import { EEventStatus } from '../../../constants/blockchain.constant';

@Entity(ETableName.EVENT_LOGS)
export class EventLog extends BaseEntityIncludeTime {
  @Column({ name: 'sender_address', type: 'varchar', nullable: false })
  senderAddress: string;

  @Column({ name: 'tx_hash_lock', type: 'varchar' })
  txHashLock: string;

  @Column({ name: 'tx_hash_unlock', type: 'varchar' })
  txHashUnlock: string;

  @Column({ name: 'network_name', type: 'varchar', enum: ENetworkName, nullable: false })
  networkName: ENetworkName;

  @Column({ name: 'block_number', type: 'bigint', nullable: false })
  blockNumber: number;

  @Column({ name: 'event', type: 'varchar', enum: EEventName, nullable: false })
  event: EEventName;

  @Column({ name: 'return_values', type: 'text' })
  returnValues: string;

  @Column({ name: 'status', type: 'varchar', enum: EEventStatus, default: EEventStatus.WAITING, nullable: false })
  status: EEventStatus;

  @Column({ name: 'retry', type: 'int' })
  retry: number;

  constructor(value: Partial<EventLog>) {
    super();
    Object.assign(this, value);
  }
}
