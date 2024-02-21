import { Column, Entity } from 'typeorm';

import { ENetworkName } from '@constants/blockchain.constant';
import { ETableName } from '@constants/entity.constant';

import { BaseEntityIncludeTime } from '@core/base.entity';

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