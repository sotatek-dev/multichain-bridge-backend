import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class CreateIndexEventLogs1727258557893 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'event_logs',
      new TableIndex({
        name: 'index-tx-hash-lock',
        columnNames: ['tx_hash_lock'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('event_logs', 'index-tx-hash-lock');
  }
}
