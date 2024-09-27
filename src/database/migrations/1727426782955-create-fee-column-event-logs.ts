import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class CreateFeeColumnEventLogs1727426782955 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.addColumns('event_logs', [
      new TableColumn({
        name: 'tip',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'gas_fee',
        type: 'varchar',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.dropColumns('event_logs', ['tip', 'gas_fee']);
  }
}
