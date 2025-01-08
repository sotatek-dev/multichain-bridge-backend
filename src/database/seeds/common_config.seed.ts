import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

import { COMMOM_CONFIG_TIP, COMMON__CONFIG_DAILY_QUOTA, EAsset } from '../../constants/api.constant.js';
import { ENetworkName, ETokenPairStatus } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { CommonConfig } from '../../modules/crawler/entities/common-config.entity.js';

export default class CommonConfigSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<any> {
    dotenv.config();
    const repository = dataSource.getRepository(CommonConfig);
    await repository.delete({});
    await repository.insert(
      new CommonConfig({
        bridgeFee: COMMOM_CONFIG_TIP,
        dailyQuota: COMMON__CONFIG_DAILY_QUOTA,
        unlockingFee: '0.0001',
        mintingFee: '0.00001',
        asset: EAsset.ETH,
        fromAddress: '0x0000000000000000000000000000000000000000',
        toAddress: process.env[EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS],
        fromScAddress: process.env[EEnvKey.ETH_BRIDGE_CONTRACT_ADDRESS],
        toScAddress: process.env[EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS],
        fromDecimal: 18,
        toDecimal: 9,
        fromSymbol: 'ETH',
        toSymbol: 'WETH',
        fromChain: ENetworkName.ETH,
        toChain: ENetworkName.MINA,
        status:ETokenPairStatus.ENABLE
      }),
    );
  }
}
