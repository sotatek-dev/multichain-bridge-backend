import { Logger } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { TransactionReceipt } from 'web3-core';
import { Contract, EventData } from 'web3-eth-contract';
import pkg from 'web3-utils';

import { sleep } from '../../utils/promise.js';
import { EthBridgeAbi } from './abis/eth-bridge-contract.js';
import { IRpcService } from './web3.module.js';

const { toBN, toHex } = pkg;
export class DefaultContract {
  private readonly logger = new Logger('CONTRACT');
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
    this.contract = new this.rpcService.web3.eth.Contract(JSON.parse(this.abi), this.contractAddress);
  }
  public getContractAddress() {
    return this.contractAddress;
  }
  public getStartBlock() {
    return this.startBlock;
  }
  public async getBlockNumber() {
    const safeBlock = parseInt(process.env?.SAFE_BLOCK ?? '0');
    const blockNumber: number = await this.wrapper(() => this.rpcService.web3.eth.getBlockNumber());

    return blockNumber - safeBlock;
  }

  public async recover(signature: string, message: string) {
    const recover = this.rpcService.web3.eth.accounts.recover(message, signature);
    return recover;
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

  public async estimateGas(method: string, param: Array<any>): Promise<number> {
    const signer = this.rpcService.web3.eth.accounts.privateKeyToAccount(this.rpcService.privateKeys);
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
    return gasLimit;
  }

  public async write(
    method: string,
    param: Array<any>,
  ): Promise<{ success: boolean; error: Error | null; data: TransactionReceipt | null }> {
    try {
      const signer = this.rpcService.web3.eth.accounts.privateKeyToAccount(this.rpcService.privateKeys);

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
    } catch (error: any) {
      return { success: false, error, data: null };
    }
  }
  public async multiWrite(
    writeData: any[],
    specifySignerIndex?: number,
  ): Promise<{ success: boolean; error: Error | null; data: TransactionReceipt[] | null }> {
    try {
      const signer = this.rpcService.web3.eth.accounts.privateKeyToAccount(
        this.rpcService.privateKeys[specifySignerIndex ?? 0],
      );

      const response = [];
      for (const element of writeData) {
        // gas estimation
        const nonce = await this.rpcService.getNonce(signer.address);
        const { method, param } = element;
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
    } catch (error: any) {
      return { success: false, error, data: null };
    }
  }

  public async getBlockTimeByBlockNumber(blockNumber: number) {
    return this.rpcService.web3.eth.getBlock(blockNumber);
  }

  public async getChainId() {
    return this.rpcService.web3.eth.getChainId();
  }

  public async convertGasPriceToEther(amount: number) {
    try {
      const gasPrice = await this.rpcService.web3.eth.getGasPrice();
      this.logger.warn('Current gas price:', gasPrice, 'wei'); // Gas price is returned in wei
      const estimateGasToWei = BigNumber(amount).multipliedBy(BigNumber(gasPrice)).toString();
      return this.rpcService.web3.utils.fromWei(estimateGasToWei, 'ether');
    } catch (error) {
      this.logger.error('Error getting gas price:', error);
    }
  }
}

export class ETHBridgeContract extends DefaultContract {
  constructor(rpcETHService: IRpcService, address: string, _startBlock: number) {
    super(rpcETHService, EthBridgeAbi, address, _startBlock);
  }

  public async getBaseURI() {
    return this.call('getBaseURI', []);
  }
  public async latestIndex() {
    return this.call('latestIndex', []);
  }
  public async getValidatorThreshold() {
    return this.call('threshold', []);
  }
  public async mintNFT(toAddress: string) {
    return this.write('mint', [toAddress]);
  }
  public async unlock(
    tokenReceivedAddress: string,
    amount: string,
    txHashLock: string,
    receiveAddress: string,
    fee?: string,
    _signatures?: string[],
  ) {
    console.log(
      '🚀 ~ ETHBridgeContract ~ unlock ~ tokenReceivedAddress, amount, txHashLock, receiveAddress, fee?, _signatures?:',
      tokenReceivedAddress,
      amount,
      txHashLock,
      receiveAddress,
      fee,
      _signatures,
    );
    return this.write('unlock', [tokenReceivedAddress, amount, receiveAddress, txHashLock, fee, _signatures]);
  }
  public async getTokenURI(tokenId: number) {
    return this.call('tokenURI', [tokenId]);
  }
}
