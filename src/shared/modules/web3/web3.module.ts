import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Web3 from 'web3';

import { initializeEthContract } from '@config/common.config';

import { ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';
import { ASYNC_CONNECTION } from '@constants/service.constant';

import { sleep } from '@shared/utils/promise';

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
  ],
  exports: [],
})
export class Web3Module {}

export interface IRpcService {
  web3: Web3;
  resetApi: () => Promise<any>;
  maxTries: number;
  privateKeys: string[];
  getNonce: (walletAddress: string) => Promise<number>;
  handleSignerCallback: () => (callback: CallableFunction, tried?: number) => Promise<any>;
}

export const RpcFactory = async (configService: ConfigService, network?: ENetworkName): Promise<IRpcService> => {
  let rpcRound = 0;
  const rpc = configService.get<string[]>(EEnvKey.ETH_BRIDGE_RPC_OPTIONS);
  const privateKeys = configService.get<string[]>(EEnvKey.SIGNER_PRIVATE_KEY);
  const keyStatus: Array<boolean> = privateKeys.map(() => false); // all signers is set to free by default.

  const getNextRPcRound = (): Web3 => {
    return new Web3(rpc[rpcRound++ % rpc.length]);
  };
  let web3 = getNextRPcRound();

  let isReseting = false;
  return {
    get web3() {
      return web3;
    },
    privateKeys,
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
    handleSignerCallback: () => {
      const handleJob = async (callback: CallableFunction, tried = 0) => {
        const freeKeyIndex = keyStatus.findIndex(e => e === false);
        if (freeKeyIndex < 0) {
          if (tried === 10) throw new Error('cannot find free signer');
          await sleep(1 * tried);
          return handleJob(callback, tried + 1);
        }
        try {
          keyStatus[freeKeyIndex] = true;
          await callback(freeKeyIndex);
          return true;
        } catch (error) {
          throw error;
        } finally {
          keyStatus[freeKeyIndex] = false;
        }
      };
      return handleJob.bind(this);
    },
  };
};
