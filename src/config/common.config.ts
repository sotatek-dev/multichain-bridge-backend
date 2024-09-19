import { ConfigService } from '@nestjs/config';

import { ENetworkName } from '../constants/blockchain.constant.js';
import { EEnvKey } from '../constants/env.constant.js';
import { RpcFactory } from '../shared/modules/web3/web3.module.js';
import { ETHBridgeContract } from '../shared/modules/web3/web3.service.js';

async function createRpcService(configService: ConfigService) {
  return await RpcFactory(configService);
}

async function createRpcEthService(configService: ConfigService) {
  return await RpcFactory(configService, ENetworkName.ETH);
}
function getEthBridgeAddress(configService: ConfigService) {
  return configService.get<string>(EEnvKey.ETH_BRIDGE_CONTRACT_ADDRESS);
}

function getEthBridgeStartBlock(configService: ConfigService) {
  return +configService.get<number>(EEnvKey.ETH_BRIDGE_START_BLOCK);
}

async function initializeEthContract(configService: ConfigService) {
  const [rpcEthService, address, _startBlock] = await Promise.all([
    createRpcEthService(configService),
    getEthBridgeAddress(configService),
    getEthBridgeStartBlock(configService),
  ]);

  // Instantiate the ETHBridgeContract with the resolved dependencies
  return new ETHBridgeContract(rpcEthService, address, _startBlock);
}
export { createRpcService, createRpcEthService, getEthBridgeAddress, getEthBridgeStartBlock, initializeEthContract };
