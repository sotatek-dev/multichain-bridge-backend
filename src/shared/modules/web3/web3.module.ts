import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Web3 from 'web3';

import { ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';
import {
  ETH_BRIDGE_ADDRESS_INJECT,
  ETH_BRIDGE_START_BLOCK_INJECT,
  RPC_ETH_SERVICE_INJECT,
  RPC_SERVICE_INJECT,
} from '@constants/service.constant';

import { sleep } from '@shared/utils/promise';

import { ETHBridgeContract } from './web3.service';

@Global()
@Module({
  providers: [
    {
      provide: RPC_SERVICE_INJECT,
      useFactory: async (configService: ConfigService) => await RpcFactory(configService),
      inject: [ConfigService],
    },
    {
      provide: RPC_ETH_SERVICE_INJECT,
      useFactory: async (configService: ConfigService) => await RpcFactory(configService, ENetworkName.ETH),
      inject: [ConfigService],
    },
    {
      provide: ETH_BRIDGE_ADDRESS_INJECT,
      useFactory: (configService: ConfigService) => configService.get<string>(EEnvKey.ETH_BRIDGE_CONTRACT_ADDRESS),
      inject: [ConfigService],
    },
    {
      provide: ETH_BRIDGE_START_BLOCK_INJECT,
      useFactory: (configService: ConfigService) => +configService.get<number>(EEnvKey.ETH_BRIDGE_START_BLOCK),
      inject: [ConfigService],
    },
    ETHBridgeContract,
  ],
  exports: [
    RPC_SERVICE_INJECT,
    RPC_ETH_SERVICE_INJECT,
    ETH_BRIDGE_ADDRESS_INJECT,
    ETH_BRIDGE_START_BLOCK_INJECT,
    ETHBridgeContract,
  ],
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
