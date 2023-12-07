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
        email: process.env.SUPER_ADMIN_EMAIL,
        password: '$2b$14$iXtmv2E0ujE9NabdtG1SkeS.JnsmKV5SDmnIxk2iupJEVB8l5Sr3a', //Abc@123
      }),
    );
  }
}
