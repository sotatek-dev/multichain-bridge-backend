import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class GlobeDailyQuotaCol1740625957806 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.addColumn('common_configuration', new TableColumn({
            name: 'daily_quota_system',
            type: 'decimal',
            precision: 78,
            scale: 5,
            default: 0,
            isNullable: false
        }))
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.dropColumn('common_configuration', 'daily_quota_system')
    }

}
