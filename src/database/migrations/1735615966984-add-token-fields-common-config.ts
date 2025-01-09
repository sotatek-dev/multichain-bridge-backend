import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTokenFieldsCommonConfig1735615966984 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.addColumns('common_configuration', [
      new TableColumn({
        name: 'from_chain',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'to_chain',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'from_symbol',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'to_symbol',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'from_address',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'to_address',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'from_decimal',
        type: 'int',
        isNullable: true,
      }),
      new TableColumn({
        name: 'to_decimal',
        type: 'int',
        isNullable: true,
      }),
      new TableColumn({
        name: 'from_sc_address',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'to_sc_address',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'status',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.dropColumns('common_configuration', [
      'from_chain',
      'to_chain',
      'from_symbol',
      'to_symbol',
      'from_address',
      'to_address',
      'from_decimal',
      'to_decimal',
      'from_sc_address',
      'to_sc_address',
      'status',
    ]);
  }
}
