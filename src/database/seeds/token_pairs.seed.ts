import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import { ENetworkName, ETokenPairStatus } from '@constants/blockchain.constant';

import { TokenPair } from '@modules/users/entities/tokenpair.entity';

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
        fromAddress: process.env.ETH_TOKEN_BRIDGE_ADDRESS,
        toAddress: process.env.MINA_TOKEN_BRIDGE_ADDRESS,
        fromDecimal: 18,
        toDecimal: 9,
        fromScAddress: process.env.ETH_BRIDGE_CONTRACT_ADDRESS,
        toScAddress: process.env.MINA_BRIDGE_CONTRACT_ADDRESS,
      },
      {
        fromChain: ENetworkName.MINA,
        toChain: ENetworkName.ETH,
        fromSymbol: 'WETH',
        toSymbol: 'ETH',
        fromAddress: process.env.MINA_TOKEN_BRIDGE_ADDRESS,
        toAddress: process.env.ETH_TOKEN_BRIDGE_ADDRESS,
        fromDecimal: 9,
        toDecimal: 18,
        fromScAddress: process.env.MINA_BRIDGE_CONTRACT_ADDRESS,
        toScAddress: process.env.ETH_BRIDGE_CONTRACT_ADDRESS,
      },
    ];
    for (let i = 0; i < listToken.length; i++) {
      const newToken = new TokenPair({
        fromChain: listToken[i].fromChain,
        toChain: listToken[i].toChain,
        fromSymbol: listToken[i].fromSymbol,
        toSymbol: listToken[i].toSymbol,
        fromAddress: listToken[i].fromAddress,
        toAddress: listToken[i].toAddress,
        fromDecimal: listToken[i].fromDecimal,
        toDecimal: listToken[i].toDecimal,
        fromScAddress: listToken[i].fromScAddress,
        toScAddress: listToken[i].toScAddress,
        status: ETokenPairStatus.ENABLE,
      });
      await repository.insert(newToken);
    }
  }
}
