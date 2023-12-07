import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Web3 from 'web3';

import { EEnvKey } from '@constants/env.constant';
import { COLLECTION_ADDRESS_INJECT, RPC_SERVICE_INJECT } from '@constants/service.constant';

import { sleep } from '@shared/utils/promise';

import { CollectionContract, MinaBridgeContract } from './web3.service';

@Global()
@Module({
  providers: [
    {
      provide: RPC_SERVICE_INJECT,
      useFactory: async (configService: ConfigService) => RpcFactory(configService),
      inject: [ConfigService],
    },
    {
      provide: COLLECTION_ADDRESS_INJECT,
      useValue: ""
    },
    MinaBridgeContract,
    CollectionContract,
  ],
  exports: [RPC_SERVICE_INJECT, COLLECTION_ADDRESS_INJECT, MinaBridgeContract, CollectionContract],
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
export const RpcFactory = async (configService: ConfigService): Promise<IRpcService> => {
  let rpcRound = 0;
  const rpc = configService.get<string[]>(EEnvKey.RPC_OPTIONS);
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
      // TODO: nonce synchronization
      return web3.eth.getTransactionCount(walletAddress);
    },
    handleSignerCallback: () => {
      const handleJob = async (callback: CallableFunction, tried = 0) => {
        const freeKeyIndex = keyStatus.findIndex(e => e === false);
        if (freeKeyIndex < 0) {
          // if no signer is free, wait and try again
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
