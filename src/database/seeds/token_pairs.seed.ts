import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import { TokenPair } from '@modules/users/entities/tokenpair.entity';
import { ENetworkName } from '@constants/blockchain.constant';

export default class TokenPairsSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    dotenv.config();
    const repository = dataSource.getRepository(TokenPair);
    await repository.insert(
      new TokenPair({
          fromChain: ENetworkName.ETH,
          toChain: ENetworkName.MINA,
          fromSymbol: 'WETH',
          toSymbol: 'WETH',
          fromAddress: '0x0C73Ebf0d63ee565405721584d9b4D52332bEA6E',
          toAddress: '0x0C73Ebf0d63ee565405721584d9b4D52332bEA6E',
          fromDecimal: 18,
          toDecimal: 18,
          fromScAddress: '0x0C73Ebf0d63ee565405721584d9b4D52332bEA6E',
          toScAddress: '0x0C73Ebf0d63ee565405721584d9b4D52332bEA6E'
        })
    );
  }
}
