import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

import { ERole } from '../../constants/api.constant.js';
import { User } from '../../modules/users/entities/user.entity.js';

export default class SuperAdminSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<any> {
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
    await repository.delete({});
    for (const admin of listAdmin) {
      const newUser = new User({
        walletAddress: admin.walletAddress,
        name: admin.name,
      });
      await repository.insert(newUser);
    }
  }
}
