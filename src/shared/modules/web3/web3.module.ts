import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Web3 from 'web3/lib/index.js';

import { initializeEthContract } from '../../../config/common.config.js';
import { EEnvKey } from '../../../constants/env.constant.js';
import { ASYNC_CONNECTION } from '../../../constants/service.constant.js';
import { sleep } from '../../utils/promise.js';
import { ETHBridgeContract } from './web3.service.js';

@Global()
@Module({
  providers: [
    {
      provide: ASYNC_CONNECTION,
      useFactory: async (configService: ConfigService) => {
        const connection = await initializeEthContract(configService);
        return connection;
      },

      inject: [ConfigService],
    },
    {
      provide: ETHBridgeContract,
      useFactory: (connection: ETHBridgeContract) => {
        return connection;
      },
      inject: [ASYNC_CONNECTION],
    },
  ],
  exports: [Web3Module, ETHBridgeContract],
})
export class Web3Module { }

export interface IRpcService {
  web3: Web3;
  resetApi: () => Promise<any>;
  maxTries: number;
  publicKey: string;
  chainId: number;
  getNonce: (walletAddress: string) => Promise<number>;
}

export const RpcFactory = async (configService: ConfigService): Promise<IRpcService> => {
  let rpcRound = 0;
  const rpc = configService.get<string[]>(EEnvKey.ETH_BRIDGE_RPC_OPTIONS)!;
  const publicKey = configService.get<string>(EEnvKey.ETH_SIGNER_PUBLIC_KEY)!;

  const getNextRPcRound = (): Web3 => {
    return new Web3(rpc[rpcRound++ % rpc.length]);
  };
  let web3 = getNextRPcRound();
  let isReseting = false;
  return {
    get web3() {
      return web3;
    },
    publicKey,
    chainId: await web3.eth.getChainId(),
    maxTries: rpc.length * 3,
    resetApi: async (): Promise<any> => {
      if (isReseting === true) {
        await sleep(1.2);
        return web3;
      }
      isReseting = true;
      web3 = getNextRPcRound();
      isReseting = false;
      return web3;
    },
    getNonce: async (walletAddress: string): Promise<number> => {
      return web3.eth.getTransactionCount(walletAddress);
    },
  };
};
