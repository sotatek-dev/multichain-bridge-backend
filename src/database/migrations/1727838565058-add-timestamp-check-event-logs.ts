import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTimestampCheckEventLogs1727838565058 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.addColumns('event_logs', [
      new TableColumn({ name: 'next_validate_signature_job_time', type: 'bigint', default: 0 }),
      new TableColumn({ name: 'next_send_tx_job_time', type: 'bigint', default: 0 }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.dropColumns('event_logs', ['next_send_tx_job_time', 'next_validate_signature_job_time']);
  }
}
