import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddErrorRetryMultiSignatureTable1726107274721 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE multi_signature ADD COLUMN retry BIGINT NULL`);
    await queryRunner.query(`ALTER TABLE multi_signature ADD COLUMN error_code TEXT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('multi_signature', 'retry');
    await queryRunner.dropColumn('multi_signature', 'error_code');
  }
}
