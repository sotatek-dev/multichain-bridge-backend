import { Column, Entity, JoinColumn, OneToMany } from 'typeorm';

import { EEventName, ENetworkName } from '@constants/blockchain.constant';
import { ETableName } from '@constants/entity.constant';

import { BaseEntityIncludeTime } from '@core/base.entity';

import { EEventStatus } from '../../../constants/blockchain.constant';
import { MultiSignature } from './multi-signature.entity';

@Entity(ETableName.EVENT_LOGS)
export class EventLog extends BaseEntityIncludeTime {
  @Column({ name: 'sender_address', type: 'varchar', nullable: false })
  senderAddress: string;

  @Column({ name: 'amount_from', type: 'varchar', nullable: false })
  amountFrom: string;

  @Column({ name: 'token_from_address', type: 'varchar', nullable: false })
  tokenFromAddress: string;

  @Column({ name: 'network_from', type: 'varchar', enum: ENetworkName, nullable: false })
  networkFrom: ENetworkName;

  @Column({ name: 'token_from_name', type: 'varchar', nullable: false })
  tokenFromName: string;

  @Column({ name: 'tx_hash_lock', type: 'varchar', nullable: false })
  txHashLock: string;

  @Column({ name: 'receive_address', type: 'varchar', nullable: true })
  receiveAddress: string;

  @Column({ name: 'amount_received', type: 'varchar', nullable: true })
  amountReceived: string;

  @Column({ name: 'token_received_address', type: 'varchar', nullable: true })
  tokenReceivedAddress: string;

  @Column({ name: 'network_received', type: 'varchar', enum: ENetworkName, nullable: true })
  networkReceived: ENetworkName;

  @Column({ name: 'token_received_name', type: 'varchar', nullable: true })
  tokenReceivedName: string;

  @Column({ name: 'tx_hash_unlock', type: 'varchar', nullable: true })
  txHashUnlock: string;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber: number;

  @Column({ name: 'block_time_lock', type: 'bigint', nullable: true })
  blockTimeLock: number;

  @Column({ name: 'protocol_fee', type: 'varchar', nullable: true })
  protocolFee: string;

  @Column({ name: 'event', type: 'varchar', enum: EEventName, nullable: false })
  event: EEventName;

  @Column({ name: 'return_values', type: 'text', nullable: false })
  returnValues: string;

  @Column({ name: 'from_token_decimal', type: 'int', nullable: true })
  fromTokenDecimal: number;

  @Column({ name: 'to_token_decimal', type: 'int', nullable: true })
  toTokenDecimal: number;

  @Column({ name: 'error_detail', type: 'text', nullable: true })
  errorDetail: string;

  @Column({ name: 'status', type: 'varchar', enum: EEventStatus, default: EEventStatus.WAITING, nullable: false })
  status: EEventStatus;

  @Column({ name: 'retry', type: 'int', nullable: false, default: 0 })
  retry: number;

  @OneToMany<MultiSignature>(() => MultiSignature, multiSignature => multiSignature.transaction)
  @JoinColumn({ name: 'id' })
  validator: MultiSignature[];

  constructor(value: Partial<EventLog>) {
    super();
    Object.assign(this, value);
  }
}
