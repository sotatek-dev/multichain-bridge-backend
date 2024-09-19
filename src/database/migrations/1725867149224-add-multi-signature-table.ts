import { MigrationInterface, QueryRunner, Table } from 'typeorm';

import { ENetworkName } from '../../constants/blockchain.constant.js';

export class AddMultiSignatureTable1725867149224 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.createTable(
      new Table({
        name: 'multi_signature',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
          },
          {
            name: 'validator',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'tx_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'signature',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'chain',
            type: 'varchar',
            length: '255',
            enum: Object.values(ENetworkName),
            isNullable: true,
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.dropTable('multi_signature');
  }
}
