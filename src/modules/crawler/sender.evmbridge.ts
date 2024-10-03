import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import assert from 'assert';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';

import { getEthBridgeAddress } from '../../config/common.config.js';
import { EEventStatus, ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { MultiSignatureRepository } from '../../database/repositories/multi-signature.repository.js';
import { TokenPairRepository } from '../../database/repositories/token-pair.repository.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { ETHBridgeContract } from '../../shared/modules/web3/web3.service.js';
import { EventLog } from './entities/event-logs.entity.js';
import { MultiSignature } from './entities/multi-signature.entity.js';

@Injectable()
export class SenderEVMBridge {
  constructor(
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly tokenPairRepository: TokenPairRepository,
    private readonly multiSignatureRepository: MultiSignatureRepository,
    private readonly ethBridgeContract: ETHBridgeContract,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {}
  private logger = this.loggerService.getLogger('SENDER_EVM_CONSOLE');

  async handleUnlockEVM(txId: number): Promise<{ error: Error | null; success: boolean }> {
    const dataLock = await this.eventLogRepository.findOne({
      where: {
        id: txId,
        networkReceived: ENetworkName.ETH,
      },
      relations: {
        validator: true,
      },
    });

    if (!dataLock) {
      this.logger.warn('data not found with tx', txId);
      return { error: null, success: false };
    }

    assert(dataLock.tip.toString(), 'invalid gasFee');
    assert(dataLock.gasFee.toString(), 'invalid tips');
    assert(dataLock.amountReceived, 'invalida amount to unlock');

    const { tokenReceivedAddress, txHashLock, receiveAddress, amountFrom } = dataLock;

    const result = await this.ethBridgeContract.unlock(
      tokenReceivedAddress,
      BigNumber(amountFrom).toString(),
      txHashLock,
      receiveAddress,
      BigNumber(dataLock.protocolFee).toString(),
      dataLock.validator.map(e => e.signature),
    );
    // Update status eventLog when call function unlock
    if (result.success) {
      await this.updateLogStatusWithRetry(dataLock, EEventStatus.PROCESSING);
    } else if (!!result.error) {
      this.logger.error(result.error);
      await this.updateLogStatusWithRetry(dataLock, EEventStatus.FAILED, result.error.message);
    }
    return result;
  }

  async validateUnlockEVMTransaction(txId: number): Promise<{ error: Error | null; success: boolean }> {
    const wallet = this.getWallet();
    const [dataLock] = await Promise.all([
      this.eventLogRepository.findOneBy({ id: txId, networkReceived: ENetworkName.ETH }),
      this.commonConfigRepository.getCommonConfig(),
    ]);
    if (!dataLock) {
      this.logger.warn('no data found tx', txId);
      return { error: null, success: false };
    }
    const { tokenReceivedAddress, txHashLock, receiveAddress } = dataLock;

    const signTx = await this.getSignature(wallet, {
      token: tokenReceivedAddress,
      amount: dataLock.amountReceived,
      user: receiveAddress,
      hash: txHashLock,
      fee: dataLock.protocolFee,
    });

    assert(signTx.success, `Generate signature failed!`);
    await this.saveSignature(wallet.address, signTx.signature, dataLock.id);

    return { error: null, success: true };
  }

  public async getSignature(wallet: ethers.Wallet, value: Record<string, any>) {
    const signature = await wallet._signTypedData(
      {
        name: this.configService.get<string>(EEnvKey.ETH_BRIDGE_DOMAIN_NAME),
        version: this.configService.get<string>(EEnvKey.ETH_BRIDGE_DOMAIN_VERSION),
        chainId: await this.ethBridgeContract.getChainId(),
        verifyingContract: getEthBridgeAddress(this.configService),
      },
      {
        UNLOCK: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'user', type: 'address' },
          { name: 'hash', type: 'string' },
          { name: 'fee', type: 'uint256' },
        ],
      },
      value,
    );

    return { success: true, signature, payload: { data: value } };
  }

  public async saveSignature(validatorAddress: string, signature: string, txId: number) {
    const validatorRecord = await this.multiSignatureRepository.findOneBy({ validator: validatorAddress, txId });

    if (validatorRecord) {
      await this.multiSignatureRepository.update({ validator: validatorAddress, txId }, { signature });
    } else {
      await this.multiSignatureRepository.save(
        new MultiSignature({ chain: ENetworkName.ETH, signature, validator: validatorAddress, txId }),
      );
    }
  }

  public async getTokenPairAndAmount(dataLock: EventLog) {
    const { tokenReceivedAddress, tokenFromAddress } = dataLock;

    const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);
    if (!tokenPair) return { tokenPair: null, amountReceived: null };

    return { tokenPair };
  }

  private async updateLogStatusWithRetry(dataLock: EventLog, status: EEventStatus, errorDetail?: string) {
    await this.eventLogRepository.updateStatusAndRetryEvenLog({
      id: dataLock.id,
      status,
      errorDetail,
    });
  }

  public getWallet(): ethers.Wallet {
    const privateKey = this.configService.get<string>(EEnvKey.EVM_VALIDATOR_PRIVATE_KEY);
    assert(!!privateKey, 'validator private key invalid');
    assert(!!this.configService.get(EEnvKey.THIS_VALIDATOR_INDEX), 'invalid validator index');

    return new ethers.Wallet(privateKey);
  }
}
