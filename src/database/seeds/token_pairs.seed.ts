import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import { TokenPair } from '@modules/users/entities/tokenpair.entity';
import { ENetworkName } from '@constants/blockchain.constant';

export default class TokenPairsSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    dotenv.config();
    const repository = dataSource.getRepository(TokenPair);
    const listToken = [
      {
        fromChain: ENetworkName.ETH,
        toChain: ENetworkName.MINA,
        fromSymbol: 'ETH',
        toSymbol: 'WETH',
        fromAddress: '0x0000000000000000000000000000000000000000',
        toAddress: 'B62qpwveL98zAusX7yfHTpdCLz9tw4DuV7WLrrAwDjQxbSgCWzHMGnq',
        fromDecimal: 18,
        toDecimal: 18,
        fromScAddress: '0x00bA9C6204C791543B95a29cA1f0DDE68e228224',
        toScAddress: 'B62qowDqQG6deejJhXoqJ5ggR9gkuAocUUBgnT6h9D8Q6ZNcebPaLfC'
      },
      {
        fromChain: ENetworkName.MINA,
        toChain: ENetworkName.ETH,
        fromSymbol: 'WETH',
        toSymbol: 'ETH',
        fromAddress: 'B62qpwveL98zAusX7yfHTpdCLz9tw4DuV7WLrrAwDjQxbSgCWzHMGnq',
        toAddress: '0x0000000000000000000000000000000000000000',
        fromDecimal: 18,
        toDecimal: 18,
        fromScAddress: 'B62qowDqQG6deejJhXoqJ5ggR9gkuAocUUBgnT6h9D8Q6ZNcebPaLfC',
        toScAddress: '0x00bA9C6204C791543B95a29cA1f0DDE68e228224'
      }
    ]
    for(let i = 0; i< listToken.length; i++) {
      let newToken = new TokenPair(
        {
          fromChain: listToken[i].fromChain,
          toChain: listToken[i].toChain,
          fromSymbol: listToken[i].fromSymbol,
          toSymbol: listToken[i].toSymbol,
          fromAddress: listToken[i].fromAddress,
          toAddress: listToken[i].toAddress,
          fromDecimal: listToken[i].fromDecimal,
          toDecimal: listToken[i].toDecimal,
          fromScAddress: listToken[i].fromScAddress,
          toScAddress: listToken[i].toScAddress
        }
      );
      await repository.insert(newToken);
    }
  }
}
