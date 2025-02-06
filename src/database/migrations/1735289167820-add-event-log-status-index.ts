import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

import { EEventStatus } from '../../constants/blockchain.constant.js';

export class AddEventLogStatusIndex1735289167820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.createIndex(
      'event_logs',
      new TableIndex({
        columnNames: ['status'],
        name: 'status_partial_index',
        where: `status IN('${EEventStatus.WAITING}','${EEventStatus.PROCESSING}','${EEventStatus.FAILED}')`,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.dropIndex('event_logs', 'status_partial_index');
  }
}
