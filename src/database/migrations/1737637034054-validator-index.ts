import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class ValidatorIndex1737637034054 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.addColumn(
            'multi_signature',
            new TableColumn({
                name: 'index',
                type: 'int4',
                isNullable: true
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.dropColumn('multi_signature', 'index')
    }

}
