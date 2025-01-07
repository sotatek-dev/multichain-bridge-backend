import { ConfigService } from '@nestjs/config';

import { EEnvKey } from '../constants/env.constant.js';
import { RpcFactory } from '../shared/modules/web3/web3.module.js';
import { Erc20ContractTemplate, ETHBridgeContract } from '../shared/modules/web3/web3.service.js';

async function createRpcService(configService: ConfigService) {
  return await RpcFactory(configService);
}

async function createRpcEthService(configService: ConfigService) {
  return await RpcFactory(configService);
}
function getEthBridgeAddress(configService: ConfigService) {
  return configService.get<string>(EEnvKey.ETH_BRIDGE_CONTRACT_ADDRESS);
}

function getEthBridgeStartBlock(configService: ConfigService) {
  return +configService.get<number>(EEnvKey.ETH_BRIDGE_START_BLOCK)!;
}
export interface IRpcInit {
  bridgeContract: ETHBridgeContract;
  erc20Template: Erc20ContractTemplate;
}
async function initializeEthContract(configService: ConfigService): Promise<IRpcInit> {
  const [rpcEthService, address, _startBlock] = await Promise.all([
    createRpcEthService(configService),
    getEthBridgeAddress(configService),
    getEthBridgeStartBlock(configService),
  ]);

  // Instantiate the ETHBridgeContract with the resolved dependencies
  return {
    bridgeContract: new ETHBridgeContract(rpcEthService, address!, _startBlock),
    erc20Template: new Erc20ContractTemplate(rpcEthService),
  };
}
export { createRpcService, createRpcEthService, getEthBridgeAddress, getEthBridgeStartBlock, initializeEthContract };
