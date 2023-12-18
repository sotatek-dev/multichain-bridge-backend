import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionReceipt } from 'web3-core';
import { Contract, EventData } from 'web3-eth-contract';
import { toBN, toHex } from 'web3-utils';

import { EEnvKey } from '@constants/env.constant';
import {
  ETH_BRIDGE_ADDRESS_INJECT,
  ETH_BRIDGE_START_BLOCK_INJECT,
  RPC_ETH_SERVICE_INJECT,
  RPC_SERVICE_INJECT,
} from '@constants/service.constant';

import { sleep } from '@shared/utils/promise';

import ETHBridgeAbi from './abis/eth-bridge-contract.json';
import MinaBridgeAbi from './abis/mina-bridge.json';
import { IRpcService } from './web3.module';

export class DefaultContract {
  private contract: Contract;
  private readonly contractAddress: string;
  private readonly abi: any;
  private readonly startBlock: number;
  constructor(
    private rpcService: IRpcService,
    _abi: any,
    _contractAddress: any,
    _startBlock: number,
  ) {
    this.abi = _abi;
    this.contractAddress = _contractAddress;
    this.startBlock = _startBlock;
    this.initContract();
  }

  private initContract() {
    this.contract = new this.rpcService.web3.eth.Contract(this.abi, this.contractAddress);
  }
  public getContractAddress() {
    return this.contractAddress;
  }
  public getStartBlock() {
    return this.startBlock;
  }
  public async getBlockNumber() {
    const safeBlock = parseInt(process.env.SAFE_BLOCK) || 0;
    const blockNumber: number = await this.wrapper(() => this.rpcService.web3.eth.getBlockNumber());

    return blockNumber - safeBlock;
  }
  public async getEvent(fromBlock: number, toBlock: number): Promise<EventData[]> {
    return this.wrapper(() =>
      this.contract.getPastEvents('allEvents', {
        fromBlock,
        toBlock,
      }),
    );
  }
  private async wrapper(callback: CallableFunction, retryOnError = true) {
    let tries = 0;
    while (1) {
      try {
        return await callback();
      } catch (error) {
        if (!retryOnError) throw error;
        if (tries++ >= this.rpcService.maxTries) throw error;
        await sleep(1.2);
        await this.rpcService.resetApi();
        this.initContract();
      }
    }
  }
  public call(method: string, param: Array<any>) {
    return this.wrapper(() => this.contract.methods[method](...param).call(), true);
  }
  public async write(
    method: string,
    param: Array<any>,
    specifySignerIndex?: number,
  ): Promise<{ success: boolean; error: Error; data: TransactionReceipt }> {
    try {
      const signer = this.rpcService.web3.eth.accounts.privateKeyToAccount(
        this.rpcService.privateKeys[specifySignerIndex ?? 0],
      );

      const data = this.contract.methods[method](...param).encodeABI();
      const gasPrice = await this.rpcService.web3.eth.getGasPrice();
      const nonce = await this.rpcService.getNonce(signer.address);      

      // gas estimation
      const rawTx = {
        nonce: nonce,
        gasPrice: toHex(toBN(gasPrice)),
        from: signer.address,
        to: this.contractAddress,
        data: data,
      };

      const gasLimit = await this.rpcService.web3.eth.estimateGas(rawTx as any);

      const signedTx = await signer.signTransaction({
        ...rawTx,
        gasLimit: toHex(toBN(gasLimit).add(toBN(10000))),
      } as any);
      
      return {
        success: true,
        error: null,
        data: await this.rpcService.web3.eth.sendSignedTransaction(signedTx.rawTransaction),
      };
    } catch (error) {
      return { success: false, error, data: null };
    }
  }
  public async multiWrite(
    writeData: any[],
    specifySignerIndex?: number,
  ): Promise<{ success: boolean; error: Error; data: TransactionReceipt[] }> {
    try {
      const signer = this.rpcService.web3.eth.accounts.privateKeyToAccount(
        this.rpcService.privateKeys[specifySignerIndex ?? 0],
      );

      const response = [];
      for (let index = 0; index < writeData.length; index++) {
        // gas estimation
        const nonce = await this.rpcService.getNonce(signer.address);
        const { method, param } = writeData[index];
        const data = this.contract.methods[method](...param).encodeABI();
        const gasPrice = await this.rpcService.web3.eth.getGasPrice();
        const rawTx = {
          nonce: nonce,
          gasPrice: toHex(toBN(gasPrice)),
          from: signer.address,
          to: this.contractAddress,
          data: data,
        };
        const gasLimit = await this.rpcService.web3.eth.estimateGas(rawTx as any);

        const signedTx = await signer.signTransaction({
          ...rawTx,
          gasLimit: toHex(toBN(gasLimit).add(toBN(10000))),
        } as any);
        response.push(await this.rpcService.web3.eth.sendSignedTransaction(signedTx.rawTransaction));
      }

      return {
        success: true,
        error: null,
        data: response,
      };
    } catch (error) {
      return { success: false, error, data: null };
    }
  }
}

@Injectable()
export class MinaBridgeContract extends DefaultContract {
  constructor(
    @Inject(RPC_SERVICE_INJECT) rpcService: IRpcService,
    private configService: ConfigService,
  ) {
    super(
      rpcService,
      MinaBridgeAbi,
      configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS),
      configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS),
    );
  }
  public async createGameCollection(name: string, symbol: string) {
    return this.write(
      'createGameCollection',
      [name, symbol, '0xa3de5504750dcadeCC49331E6D2730978397407B'], //hard-fix the address
    );
  }
  // use this to get the address before creating the collection
  public async generateCollectionAddress(_name: string, _symbol: string) {
    return this.call('getAddress', [_name, _symbol]);
  }
  // use this to get created collection
  public async getCollection(name: string, symbol: string) {
    return this.call('getCollection', [name, symbol]);
  }
}

@Injectable()
export class ETHBridgeContract extends DefaultContract {
  constructor(
    @Inject(RPC_ETH_SERVICE_INJECT) rpcETHService: IRpcService,
    @Inject(ETH_BRIDGE_ADDRESS_INJECT) address: string,
    @Inject(ETH_BRIDGE_START_BLOCK_INJECT) startBlock: number,
  ) {
    super(rpcETHService, ETHBridgeAbi, address, startBlock);
  }
  public async getBaseURI() {
    return this.call('getBaseURI', []);
  }
  public async latestIndex() {
    return this.call('latestIndex', []);
  }
  public async mintNFT(toAddress: string) {
    return this.write('mint', [toAddress]);
  }
  public async unlock(tokenFromAddress, amount, txHashLock, receiveAddress) {
    return this.write('unlock', [tokenFromAddress, amount, receiveAddress, txHashLock])
  }
  public async getTokenURI(tokenId: number) {
    return this.call('tokenURI', [tokenId]);
  }
}
