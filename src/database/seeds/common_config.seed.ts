import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import { COMMOM_CONFIG_TIP, COMMON__CONFIG_DAILY_QUOTA, EAsset } from '../../constants/api.constant.js';
import { CommonConfig } from '../../modules/crawler/entities/common-config.entity.js';

export default class CommonConfigSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    dotenv.config();
    const repository = dataSource.getRepository(CommonConfig);
    await repository.insert(
      new CommonConfig({
        tip: COMMOM_CONFIG_TIP,
        dailyQuota: COMMON__CONFIG_DAILY_QUOTA,
        asset: EAsset.ETH,
      }),
    );
  }
}
