import { Column, Entity } from 'typeorm';

import { ENetworkName, ETokenPairStatus } from '../../../constants/blockchain.constant.js';
import { ETableName } from '../../../constants/entity.constant.js';

import { BaseEntityIncludeTime } from '../../../core/base.entity.js';

@Entity(ETableName.TOKEN_PAIRS)
export class TokenPair extends BaseEntityIncludeTime {
  @Column({ name: 'from_chain', type: 'varchar', enum: ENetworkName, nullable: false })
  fromChain: ENetworkName;

  @Column({ name: 'to_chain', type: 'varchar', enum: ENetworkName, nullable: false })
  toChain: ENetworkName;

  @Column({ name: 'from_symbol', type: 'varchar', nullable: false })
  fromSymbol: string;

  @Column({ name: 'to_symbol', type: 'varchar', nullable: false })
  toSymbol: string;

  @Column({ name: 'from_address', type: 'varchar', nullable: false })
  fromAddress: string;

  @Column({ name: 'to_address', type: 'varchar', nullable: false })
  toAddress: string;

  @Column({ name: 'from_decimal', type: 'int', nullable: true })
  fromDecimal: number;

  @Column({ name: 'to_decimal', type: 'int', nullable: true })
  toDecimal: number;

  @Column({ name: 'from_sc_address', type: 'varchar', nullable: true })
  fromScAddress: string;

  @Column({ name: 'to_sc_address', type: 'varchar', nullable: true })
  toScAddress: string;

  @Column({
    name: 'status',
    type: 'varchar',
    enum: ETokenPairStatus,
    default: ETokenPairStatus.ENABLE,
    nullable: false,
  })
  status: ETokenPairStatus;

  constructor(value: Partial<TokenPair>) {
    super();
    Object.assign(this, value);
  }
}
