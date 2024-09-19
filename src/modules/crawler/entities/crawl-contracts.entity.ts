import { Column, Entity } from 'typeorm';

import { ENetworkName } from '../../../constants/blockchain.constant.js';
import { ETableName } from '../../../constants/entity.constant.js';

import { BaseEntityIncludeTime } from '../../../core/base.entity.js';

@Entity(ETableName.CRAWL_CONTRACTS)
export class CrawlContract extends BaseEntityIncludeTime {
  @Column({ name: 'contract_address', type: 'varchar', nullable: false })
  contractAddress: string;

  @Column({ name: 'latest_block', type: 'bigint', nullable: false })
  latestBlock: number;

  @Column({ name: 'network_name', type: 'varchar', enum: ENetworkName, nullable: false })
  networkName: ENetworkName;

  constructor(value: Partial<CrawlContract>) {
    super();
    Object.assign(this, value);
  }
}
