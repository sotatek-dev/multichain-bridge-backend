import { MigrationInterface, QueryRunner, Table } from "typeorm"

export class TokenPairs1704942782313 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      return queryRunner.createTable(
          new Table({
            name: 'token_pairs',
            columns: [
              {
                name: 'id',
                type: 'int',
                isPrimary: true,
                isGenerated: true,
              },
              {
                name: 'from_chain',
                type: 'varchar',
                length: '255',
                isNullable: false,
              },
              {
                name: 'to_chain',
                type: 'varchar',
                length: '255',
                isNullable: false,
              },
              {
                name: 'from_symbol',
                type: 'varchar',
                length: '255',
                isNullable: false,
              },
              {
                name: 'to_symbol',
                type: 'varchar',
                length: '255',
                isNullable: false,
              },
              {
                name: 'from_address',
                type: 'varchar',
                length: '255',
                isNullable: false,
              },
              {
                name: 'to_address',
                type: 'varchar',
                length: '255',
                isNullable: false,
              },
              {
                name: 'from_decimal',
                type: 'int',
                isNullable: false,
              },
              {
                name: 'to_decimal',
                type: 'int',
                isNullable: false,
              },
              {
                name: 'from_sc_address',
                type: 'varchar',
                length: '255',
                isNullable: false,
              },
              {
                name: 'to_sc_address',
                type: 'varchar',
                length: '255',
                isNullable: false,
              },
              {
                name: 'status',
                type: 'varchar',
                length: '255',
                isNullable: false,
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
      return queryRunner.dropTable('token_pairs');
    }

}
