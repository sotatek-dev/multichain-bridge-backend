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
  dailyQuota: number;

  @Column({
    name: 'tip',
    type: 'decimal',
    precision: 4,
    scale: 1,
    default: 0,
    nullable: false,
  })
  tip: number;

  @Column({ name: 'asset', type: 'varchar', nullable: true })
  asset: string;

  constructor(value: Partial<CommonConfig>) {
    super();
    Object.assign(this, value);
  }
}
