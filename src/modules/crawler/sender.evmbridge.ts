import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import BigNumber from 'bignumber.js/bignumber.mjs';
import { ethers } from 'ethers';
import { Logger } from 'log4js';

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
import { addDecimal, calculateFee } from '../../shared/utils/bignumber.js';
import { EventLog } from './entities/event-logs.entity.js';
import { MultiSignature } from './entities/multi-signature.entity.js';

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
  ) {
    this.logger = loggerService.getLogger('SENDER_EVM_CONSOLE');
  }

  async handleUnlockEVM() {
    let dataLock: EventLog;
    try {
      const [threshold, configTip] = await Promise.all([
        this.ethBridgeContract.getValidatorThreshold(),
        this.commonConfigRepository.getCommonConfig(),
      ]);

      dataLock = await this.eventLogRepository.getEventLockWithNetwork(ENetworkName.ETH, threshold);
      if (!dataLock) return;
      await this.eventLogRepository.updateLockEvenLog(dataLock.id, EEventStatus.PROCESSING);

      const { tokenReceivedAddress, txHashLock, receiveAddress } = dataLock;

      const { tokenPair, amountReceive } = await this.getTokenPairAndAmount(dataLock);
      if (!tokenPair) {
        await this.updateLogStatusWithRetry(dataLock, EEventStatus.NOTOKENPAIR);
        return;
      }

      const isPassQuota = await this.isPassDailyQuota(dataLock.senderAddress, tokenPair.fromDecimal);
      if (!isPassQuota) {
        await this.updateLogStatusWithRetry(dataLock, EEventStatus.FAILED, EError.OVER_DAILY_QUOTA);
        return;
      }
      // const gasFee = await this.ethBridgeContract.getEstimateGas(
      //   tokenReceivedAddress,
      //   BigNumber(amountReceive),
      //   txHashLock,
      //   receiveAddress,
      //   0,
      // );
      const protocolFee = calculateFee(
        amountReceive,
        addDecimal(this.configService.get(EEnvKey.GAS_FEE_EVM), this.configService.get(EEnvKey.DECIMAL_TOKEN_EVM)),
        configTip.tip,
      );
      const result = await this.ethBridgeContract.unlock(
        tokenReceivedAddress,
        BigNumber(amountReceive),
        txHashLock,
        receiveAddress,
        BigNumber(protocolFee),
        dataLock.validator.map(e => e.signature),
      );
      // Update status eventLog when call function unlock
      if (result.success) {
        await this.updateLogStatusWithRetry(dataLock, EEventStatus.PROCESSING);
      } else {
        await this.handleError(result.error, dataLock);
      }
      return result;
    } catch (error) {
      await this.handleError(error, dataLock);
    }
  }

  async unlockEVMTransaction() {
    let dataLock: EventLog;
    try {
      const wallet = this.getWallet();
      const [validatorData, configTip] = await Promise.all([
        this.eventLogRepository.getValidatorPendingSignature(wallet.address, ENetworkName.ETH),
        this.commonConfigRepository.getCommonConfig(),
      ]);
      dataLock = validatorData;
      if (!dataLock) {
        return;
      }
      const { tokenReceivedAddress, txHashLock, receiveAddress } = dataLock;
      const { tokenPair, amountReceive } = await this.getTokenPairAndAmount(dataLock);
      if (!tokenPair) {
        await this.updateLogStatusWithRetry(dataLock, EEventStatus.NOTOKENPAIR);
        return;
      }

      // const gasFee = await this.ethBridgeContract.getEstimateGas(
      //   tokenReceivedAddress,
      //   BigNumber(amountReceive),
      //   txHashLock,
      //   receiveAddress,
      //   0,
      // );
      const protocolFee = calculateFee(
        amountReceive,
        addDecimal(this.configService.get(EEnvKey.GAS_FEE_EVM), this.configService.get(EEnvKey.DECIMAL_TOKEN_EVM)),
        configTip.tip,
      );

      const signTx = await this.getSignature(wallet, {
        token: tokenReceivedAddress,
        amount: amountReceive,
        user: receiveAddress,
        hash: txHashLock,
        fee: protocolFee.toString(),
      });

      if (signTx.success) await this.saveSignature(wallet.address, signTx.signature, dataLock.id);
    } catch (error) {
      await this.handleError(error, dataLock, true, this.getWallet().address);
    }
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

  private async handleError(error: unknown, dataLock: EventLog, isMultiSignature = false, wallet?: string) {
    this.logger.log(EError.INVALID_SIGNATURE, error);
    const retryCount = dataLock ? Number(dataLock.retry + 1) : 1;

    if (isMultiSignature) {
      await this.upsertErrorAndRetryMultiSignature(wallet, dataLock.id, error);
    } else {
      await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, retryCount, EEventStatus.FAILED, error);
    }
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

  public async upsertErrorAndRetryMultiSignature(validator: string, txId: number, errorCode: unknown) {
    const validatorSignature = await this.multiSignatureRepository.findOne({
      where: { txId, validator },
    });
    if (!validatorSignature) {
      await this.multiSignatureRepository.save(
        new MultiSignature({ txId, validator, retry: 1, errorCode, chain: ENetworkName.ETH }),
      );
    } else {
      await this.multiSignatureRepository.update({ txId, validator }, { retry: ++validatorSignature.retry, errorCode });
    }
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
    if (!tokenPair) return { tokenPair: null, amountReceive: null };

    const amountReceive = BigNumber(amountFrom)
      .dividedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.fromDecimal))
      .multipliedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.toDecimal))
      .toString();

    return { tokenPair, amountReceive };
  }

  private async updateLogStatusWithRetry(dataLock: EventLog, status: EEventStatus, errorCode?: EError) {
    await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, status, errorCode);
  }

  public getWallet(): ethers.Wallet {
    const privateKey = this.configService.get<string>(EEnvKey.SIGNER_PRIVATE_KEY);
    return new ethers.Wallet(privateKey);
  }
}
