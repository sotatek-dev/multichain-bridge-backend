import { BigNumber } from 'bignumber.js';
import { Column, Entity } from 'typeorm';

import { ENetworkName, ETokenPairStatus } from '../../../constants/blockchain.constant.js';
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
  bridgeFee: number;

  @Column({
    name: 'fee_unlock_mina',
    type: 'varchar',
  })
  mintingFee: string;

  @Column({
    name: 'fee_unlock_eth',
    type: 'varchar',
  })
  unlockingFee: string;

  @Column({ name: 'asset', type: 'varchar', nullable: true })
  asset: string;

  @Column({ name: 'total_weth_minted', type: 'varchar', default: '0' })
  totalWethMinted: string;

  @Column({ name: 'total_weth_burnt', type: 'varchar', default: '0' })
  totalWethBurnt: string;

  // pairs detail
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

  @Column({ name: 'is_hidden', default: false })
  isHidden: boolean;

  @Column({
    name: 'status',
    type: 'varchar',
    enum: ETokenPairStatus,
    default: ETokenPairStatus.ENABLE,
    nullable: false,
  })
  status: ETokenPairStatus;
  // end pair detail
  constructor(value: Partial<CommonConfig>) {
    super();
    Object.assign(this, value);
  }
  toJSON() {
    const totalCirculation = new BigNumber(this.totalWethMinted)
      .minus(this.totalWethBurnt)
      .div(BigNumber(this.fromDecimal).pow(this.toDecimal));
    if (totalCirculation.lt(0)) {
      return { ...this, totalCirculation: '0' };
    }
    return { ...this, totalCirculation: totalCirculation.toString() };
  }
}
