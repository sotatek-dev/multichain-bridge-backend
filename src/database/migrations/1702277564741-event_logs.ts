import { MigrationInterface, QueryRunner, Table } from 'typeorm';

import { EEventName, EEventStatus } from '@constants/blockchain.constant';

export class EventLogs1702277564741 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.createTable(
      new Table({
        name: 'event_logs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
          },
          {
            name: 'sender_address',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'tx_hash_lock',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'tx_hash_unlock',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'amount_from',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'token_from_address',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'network_from',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'token_from_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'receive_address',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'amount_received',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'token_received_address',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'token_received_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'network_received',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'block_time_lock',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'protocol_fee',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'return_values',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'from_token_decimal',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'to_token_decimal',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'error_detail',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'block_number',
            type: 'bigint',
          },
          {
            name: 'event',
            type: 'varchar',
            length: '255',
            enum: Object.values(EEventName),
          },
          {
            name: 'status',
            type: 'varchar',
            length: '255',
            enum: Object.values(EEventStatus),
            default: `'${EEventStatus.WAITING}'`,
          },
          {
            name: 'retry',
            type: 'int',
            isNullable: true,
            default: 0,
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
    return queryRunner.dropTable('event_logs');
  }
}
