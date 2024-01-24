import { MigrationInterface, QueryRunner, Table } from "typeorm"

export class TokenPrices1706003901044 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.createTable(
            new Table({
              name: 'token_prices',
              columns: [
                {
                  name: 'id',
                  type: 'int',
                  isPrimary: true,
                  isGenerated: true,
                },
                {
                  name: 'symbol',
                  type: 'varchar',
                  length: '255',
                },
                {
                  name: 'price_usd',
                  type: 'varchar',
                  length: '255'
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
      return queryRunner.dropTable('token_prices');
    }

}
