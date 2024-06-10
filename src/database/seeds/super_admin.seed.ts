import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import { User } from '@modules/users/entities/user.entity';

export default class SuperAdminSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    dotenv.config();
    const repository = dataSource.getRepository(User);
    const listAdmin = [
      {
        walletAddress: process.env.ADMIN_ADDRESS_EVM,
        name: 'admin evm',
      },
      {
        walletAddress: process.env.ADMIN_ADDRESS_MINA,
        name: 'admin mina',
      },
    ];

    for (let i = 0; i < listAdmin.length; i++) {
      const newUser = new User({
        walletAddress: listAdmin[i].walletAddress,
        name: listAdmin[i].name,
      });
      await repository.insert(newUser);
    }
  }
}
