import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdjustConfigurationTable1727776349408 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE common_configuration
                        ALTER COLUMN tip TYPE NUMERIC(100, 4);`);
    await queryRunner.query(`ALTER TABLE common_configuration
                            ALTER COLUMN daily_quota TYPE NUMERIC(100, 4);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
