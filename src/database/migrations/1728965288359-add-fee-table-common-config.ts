import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFeeTableCommonConfig1728965288359 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.addColumns('common_configuration', [
      new TableColumn({ name: 'fee_unlock_mina', type: 'varchar', default: '0' }),
      new TableColumn({ name: 'fee_unlock_eth', type: 'varchar', default: '0' }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.dropColumns('common_configuration', ['fee_unlock_mina', 'fee_unlock_eth']);
  }
}
