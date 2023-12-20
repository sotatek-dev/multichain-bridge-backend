import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import { User } from '@modules/users/entities/user.entity';

export default class SuperAdminSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    dotenv.config();
    const repository = dataSource.getRepository(User);
    await repository.insert(
      new User({
        walletAddress: '0xb3Edf83eA590F44f5c400077EBd94CCFE10E4Bb0',
        name: 'admin 1',
      }),
    );
  }
}
