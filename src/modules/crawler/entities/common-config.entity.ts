import { Column, Entity } from 'typeorm';

import { ETableName } from '../../../constants/entity.constant.js';
import { BaseEntityIncludeTime } from '../../../core/base.entity.js';

@Entity(ETableName.COMMON_CONFIGURATION)
export class CommonConfig extends BaseEntityIncludeTime {
  @Column({
    name: 'daily_quota',
    type: 'decimal',
    precision: 78,
    scale: 1,
    default: 0,
    nullable: false,
  })
  dailyQuotaPerAddress: number;

  @Column({
    name: 'daily_quota_system',
    type: 'decimal',
    precision: 78,
    scale: 1,
    default: 0,
    nullable: false,
  })
  dailyQuotaSystem: number;

  @Column({
    name: 'tip',
    type: 'decimal',
    precision: 4,
    scale: 1,
    default: 0,
    nullable: false,
  })
  tip: number;

  @Column({
    name: 'fee_unlock_mina',
    type: 'varchar',
  })
  feeUnlockMina: string;

  @Column({
    name: 'fee_unlock_eth',
    type: 'varchar',
  })
  feeUnlockEth: string;

  @Column({ name: 'asset', type: 'varchar', nullable: true })
  asset: string;

  @Column({ name: 'total_weth_minted', type: 'varchar', default: '0' })
  totalWethMinted: string;

  @Column({ name: 'total_weth_burnt', type: 'varchar', default: '0' })
  totalWethBurnt: string;

  constructor(value: Partial<CommonConfig>) {
    super();
    Object.assign(this, value);
  }
}
