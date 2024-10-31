import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTokenCirculation1730343431370 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.addColumns('common_configuration', [
      new TableColumn({
        name: 'total_weth_minted',
        type: 'varchar',
        default: '0',
      }),
      new TableColumn({
        name: 'total_weth_burnt',
        type: 'varchar',
        default: '0',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.dropColumns('common_configuration', ['total_weth_minted', 'total_weth_burnt']);
  }
}
