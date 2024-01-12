import { MigrationInterface, QueryRunner, Table } from "typeorm"

export class CommonConfiguration1704942762214 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.createTable(
            new Table({
              name: 'common_configuration',
              columns: [
                {
                  name: 'id',
                  type: 'int',
                  isPrimary: true,
                  isGenerated: true,
                },
                {
                  name: 'daily_quota',
                  type: 'decimal',
                  precision: 78,
                  scale: 1,
                  default: 0,
                  isNullable: false
                },
                {
                  name: 'tip',
                  type: 'decimal',
                  precision: 4,
                  scale: 1,
                  default: 0,
                  isNullable: false
                },
                {
                  name: 'asset',
                  type: 'varchar',
                  length: '255',
                  isNullable: true,
                  default: null,
                },
                {
                  name: 'created_at',
                  type: 'timestamp',
                  default: 'CURRENT_TIMESTAMP',
                },
                {
                  name: 'updated_at',
                  type: 'timestamp',
                  default: 'CURRENT_TIMESTAMP',
                },
                {
                  name: 'deleted_at',
                  type: 'timestamp',
                  isNullable: true,
                },
              ],
            }),
          );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      return queryRunner.dropTable('common_configuration');
    }

}
