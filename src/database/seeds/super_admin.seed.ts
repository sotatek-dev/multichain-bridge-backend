import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import { ERole } from '@constants/api.constant';

import { User } from '@modules/users/entities/user.entity';

export default class SuperAdminSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    dotenv.config();
    const repository = dataSource.getRepository(User);
    const listAdmin = [
      {
        walletAddress: process.env.ADMIN_ADDRESS_EVM,
        name: ERole.EVM_ADMIN,
      },
      {
        walletAddress: process.env.ADMIN_ADDRESS_MINA,
        name: ERole.MINA_ADMIN,
      },
    ];

    for (const admin of listAdmin) {
      const newUser = new User({
        walletAddress: admin.walletAddress,
        name: admin.name,
      });
      await repository.insert(newUser);
    }
  }
}
