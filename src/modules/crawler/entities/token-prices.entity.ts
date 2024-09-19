import { Column, Entity } from 'typeorm';

import { ETableName } from '../../../constants/entity.constant.js';
import { BaseEntityIncludeTime } from '../../../core/base.entity.js';

@Entity(ETableName.TOKEN_PRICES)
export class TokenPrice extends BaseEntityIncludeTime {
  @Column({ name: 'symbol', type: 'varchar', nullable: false })
  symbol: string;

  @Column({ name: 'price_usd', type: 'varchar', nullable: false })
  priceUsd: string;

  constructor(value: Partial<TokenPrice>) {
    super();
    Object.assign(this, value);
  }
}
