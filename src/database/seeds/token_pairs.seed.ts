import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

export default class TokenPairsSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<any> {
    dotenv.config();
  }
}
