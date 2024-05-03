import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import { CommonConfig } from '@modules/crawler/entities/common-config.entity';

export default class CommonConfigSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    dotenv.config();
    const repository = dataSource.getRepository(CommonConfig);
    await repository.insert(
      new CommonConfig({
        tip: 0.5,
        dailyQuota: 500,
        asset: 'ETH',
      }),
    );
  }
}
