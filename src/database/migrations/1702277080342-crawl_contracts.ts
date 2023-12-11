import { MigrationInterface, QueryRunner, Table } from 'typeorm';

import { ENetworkName } from '@constants/blockchain.constant';

export class CrawlContracts1702277080342 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.createTable(
      new Table({
        name: 'crawl_contracts',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
          },
          {
            name: 'contract_address',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'latest_block',
            type: 'bigint',
          },
          {
            name: 'network_name',
            type: 'varchar',
            length: '255',
            enum: Object.values(ENetworkName),
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
