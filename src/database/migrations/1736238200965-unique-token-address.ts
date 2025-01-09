import { MigrationInterface, QueryRunner, TableUnique } from 'typeorm';

export class UniqueTokenAddress1736238200965 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createUniqueConstraint(
      'common_configuration',
      new TableUnique({
        name: 'unique_from_address',
        columnNames: ['from_address'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint('common_configuration', 'unique-from-address');
  }
}
