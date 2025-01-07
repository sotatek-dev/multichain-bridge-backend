import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddToggleVisibilityTokenPair1736240154189 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.addColumns('common_configuration', [
      new TableColumn({
        name: 'is_hidden',
        type: 'boolean',
        default: false,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.dropColumns('common_configuration', ['is_hidden']);
  }
}
