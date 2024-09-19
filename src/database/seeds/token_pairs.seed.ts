import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import { EAsset } from '../../constants/api.constant.js';
import { ENetworkName, ETokenPairStatus } from '../../constants/blockchain.constant.js';

import { TokenPair } from '../../modules/users/entities/tokenpair.entity.js';

export default class TokenPairsSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    dotenv.config();
    const repository = dataSource.getRepository(TokenPair);
    const listToken = [
      {
        fromChain: ENetworkName.ETH,
        toChain: ENetworkName.MINA,
        fromSymbol: EAsset.ETH,
        toSymbol: EAsset.WETH,
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
        fromSymbol: EAsset.WETH,
        toSymbol: EAsset.ETH,
        fromAddress: process.env.MINA_TOKEN_BRIDGE_ADDRESS,
        toAddress: process.env.ETH_TOKEN_BRIDGE_ADDRESS,
        fromDecimal: 9,
        toDecimal: 18,
        fromScAddress: process.env.MINA_BRIDGE_CONTRACT_ADDRESS,
        toScAddress: process.env.ETH_BRIDGE_CONTRACT_ADDRESS,
      },
    ];
    for (const token of listToken) {
      const newToken = new TokenPair({
        fromChain: token.fromChain,
        toChain: token.toChain,
        fromSymbol: token.fromSymbol,
        toSymbol: token.toSymbol,
        fromAddress: token.fromAddress,
        toAddress: token.toAddress,
        fromDecimal: token.fromDecimal,
        toDecimal: token.toDecimal,
        fromScAddress: token.fromScAddress,
        toScAddress: token.toScAddress,
        status: ETokenPairStatus.ENABLE,
      });
      await repository.insert(newToken);
    }
  }
}
