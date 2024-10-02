import { MigrationInterface, QueryRunner, TableUnique } from 'typeorm';

export class UniqueValidatorTx1727799403569 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.createUniqueConstraint(
      'multi_signature',
      new TableUnique({
        name: 'unique_validator_tx',
        columnNames: ['validator', 'tx_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.dropUniqueConstraint('multi_signature','unique_validator_tx')
  }
}
