import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import assert from 'assert';
import { BigNumber } from 'bignumber.js';
// import BigNumber from 'bignumber.js/bignumber.mjs';
import { ethers } from 'ethers';
import { Logger } from 'log4js';
import { Not } from 'typeorm';

import { getEthBridgeAddress } from '../../config/common.config.js';
import { DECIMAL_BASE, EEventStatus, ENetworkName } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { EError } from '../../constants/error.constant.js';
import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../database/repositories/event-log.repository.js';
import { MultiSignatureRepository } from '../../database/repositories/multi-signature.repository.js';
import { TokenPairRepository } from '../../database/repositories/token-pair.repository.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { ETHBridgeContract } from '../../shared/modules/web3/web3.service.js';
import { addDecimal, calculateFee, calculateTip } from '../../shared/utils/bignumber.js';
import { EventLog } from './entities/event-logs.entity.js';
import { MultiSignature } from './entities/multi-signature.entity.js';
import { JobUnlockProvider } from './job-unlock.provider.js';

@Injectable()
export class SenderEVMBridge {
  private readonly logger: Logger;
  constructor(
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly tokenPairRepository: TokenPairRepository,
    private readonly multiSignatureRepository: MultiSignatureRepository,
    private readonly ethBridgeContract: ETHBridgeContract,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
    private readonly unlockJobProvider: JobUnlockProvider,
  ) {
    this.logger = loggerService.getLogger('SENDER_EVM_CONSOLE');
  }

  async handleUnlockEVM(txId: number) {
    const [dataLock, configTip] = await Promise.all([
      this.eventLogRepository.findOne({
        where: {
          id: txId,
          networkReceived: ENetworkName.ETH,
          status: Not(EEventStatus.PROCESSING),
        },
        relations: {
          validator: true,
        },
      }),
      this.commonConfigRepository.getCommonConfig(),
    ]);

    if (!dataLock) {
      this.logger.warn('data not found with tx', txId);
      return;
    }

    const { tokenReceivedAddress, txHashLock, receiveAddress } = dataLock;

    const { tokenPair, amountReceived } = await this.getTokenPairAndAmount(dataLock);
    if (!tokenPair) {
      this.logger.warn('No token pair found!');
      await this.updateLogStatusWithRetry(dataLock, EEventStatus.NOTOKENPAIR);
      return;
    }

    const isPassQuota = await this.isPassDailyQuota(dataLock.senderAddress, tokenPair.fromDecimal);
    if (!isPassQuota) {
      this.logger.warn('Over daility quota!');
      await this.updateLogStatusWithRetry(dataLock, EEventStatus.FAILED, EError.OVER_DAILY_QUOTA);
      return;
    }
    const gasFeeEvmWithoutDecimals = this.configService.get(EEnvKey.GAS_FEE_EVM);
    // fee and received amount.
    const gasFeeEth = addDecimal(gasFeeEvmWithoutDecimals, this.configService.get(EEnvKey.DECIMAL_TOKEN_EVM));
    const protocolFee = calculateFee(amountReceived, gasFeeEth, configTip.tip);
    // call unlock function
    const result = await this.ethBridgeContract.unlock(
      tokenReceivedAddress,
      BigNumber(amountReceived),
      txHashLock,
      receiveAddress,
      BigNumber(protocolFee),
      dataLock.validator.map(e => e.signature),
    );
    // Update status eventLog when call function unlock
    if (result.success) {
      await this.eventLogRepository.updateStatusAndRetryEvenLog({
        id: dataLock.id,
        status: EEventStatus.PROCESSING,
        errorDetail: null,
        protocolFee,
        amountReceived: BigNumber(amountReceived).minus(protocolFee).toFixed(0),
        gasFee: gasFeeEvmWithoutDecimals,
        tip: calculateTip(amountReceived, gasFeeEth, configTip.tip)
          .div(BigNumber(DECIMAL_BASE).pow(tokenPair.toDecimal))
          .toString(),
      });
    } else {
      this.logger.error(result.error);
      this.updateLogStatusWithRetry(dataLock, EEventStatus.FAILED);
    }

    return result;
  }

  async validateUnlockEVMTransaction(txId: number) {
    const wallet = this.getWallet();
    const [dataLock, configTip] = await Promise.all([
      this.eventLogRepository.findOneBy({ id: txId, networkReceived: ENetworkName.ETH }),
      this.commonConfigRepository.getCommonConfig(),
    ]);
    if (!dataLock) {
      this.logger.warn('no data found tx', txId);
      return;
    }
    const { tokenReceivedAddress, txHashLock, receiveAddress } = dataLock;
    const { tokenPair, amountReceived } = await this.getTokenPairAndAmount(dataLock);
    if (!tokenPair) {
      this.logger.warn('no token pair found tx', dataLock.tokenReceivedAddress, dataLock.tokenFromAddress);
      await this.updateLogStatusWithRetry(dataLock, EEventStatus.NOTOKENPAIR);
      return;
    }

    const protocolFee = calculateFee(
      amountReceived,
      addDecimal(this.configService.get(EEnvKey.GAS_FEE_EVM), this.configService.get(EEnvKey.DECIMAL_TOKEN_EVM)),
      configTip.tip,
    );

    const signTx = await this.getSignature(wallet, {
      token: tokenReceivedAddress,
      amount: amountReceived,
      user: receiveAddress,
      hash: txHashLock,
      fee: protocolFee.toString(),
    });
    assert(signTx.success, `Generate signature failed!`);
    await this.saveSignature(wallet.address, signTx.signature, dataLock.id);
  }

  private async isPassDailyQuota(address: string, fromDecimal: number): Promise<boolean> {
    const [dailyQuota, totalamount] = await Promise.all([
      await this.commonConfigRepository.getCommonConfig(),
      await this.eventLogRepository.sumAmountBridgeOfUserInDay(address),
    ]);

    return totalamount &&
      BigNumber(totalamount.totalamount).isGreaterThan(addDecimal(dailyQuota.dailyQuota, fromDecimal))
      ? false
      : true;
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
    const { tokenReceivedAddress, tokenFromAddress, amountFrom } = dataLock;

    const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);
    if (!tokenPair) return { tokenPair: null, amountReceived: null };

    const amountReceived = BigNumber(amountFrom)
      .dividedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.fromDecimal))
      .multipliedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.toDecimal))
      .toString();

    return { tokenPair, amountReceived };
  }

  private async updateLogStatusWithRetry(dataLock: EventLog, status: EEventStatus, errorDetail?: EError) {
    await this.eventLogRepository.updateStatusAndRetryEvenLog({
      id: dataLock.id,
      status,
      errorDetail,
    });
  }

  public getWallet(): ethers.Wallet {
    assert(!!this.configService.get(EEnvKey.EVM_VALIDATOR_PRIVATE_KEY), 'validator private key invalid');
    assert(!!this.configService.get(EEnvKey.THIS_VALIDATOR_INDEX), 'invalid validator index');

    const privateKey = this.configService.get<string>(EEnvKey.EVM_VALIDATOR_PRIVATE_KEY);
    return new ethers.Wallet(privateKey);
  }
}
