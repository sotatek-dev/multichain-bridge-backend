import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import BigNumber from 'bignumber.js';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { MultiSignatureRepository } from 'database/repositories/multi-signature.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import { ethers } from 'ethers';
import { Logger } from 'log4js';

import { getEthBridgeAddress } from '@config/common.config';

import { DECIMAL_BASE, EEventStatus, ENetworkName, FIXED_ESTIMATE_GAS } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';
import { EError } from '@constants/error.constant';

import { LoggerService } from '@shared/modules/logger/logger.service';
import { ETHBridgeContract } from '@shared/modules/web3/web3.service';
import { addDecimal, calculateFee } from '@shared/utils/bignumber';

import { EventLog } from './entities';
import { CommonConfig } from './entities/common-config.entity';
import { MultiSignature } from './entities/multi-signature.entity';

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
    let dataLock: EventLog, configTip: CommonConfig;
    try {
      const threshold = await this.ethBridgeContract.getValidatorThreshold();

      [dataLock, configTip] = await Promise.all([
        this.eventLogRepository.getEventLockWithNetwork(ENetworkName.ETH, threshold),
        this.commonConfigRepository.getCommonConfig(),
      ]);

      if (!dataLock) {
        return;
      }
      await this.eventLogRepository.updateLockEvenLog(dataLock.id, EEventStatus.PROCESSING);

      const { tokenReceivedAddress, tokenFromAddress, txHashLock, receiveAddress, senderAddress, amountFrom } =
        dataLock;

      const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);
      if (!tokenPair) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(
          dataLock.id,
          dataLock.retry,
          EEventStatus.NOTOKENPAIR,
        );
        return;
      }

      const amountReceive = BigNumber(amountFrom)
        .dividedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.fromDecimal))
        .multipliedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.toDecimal))
        .toString();

      const isPassDailyQuota = await this.isPassDailyQuota(senderAddress, tokenPair.fromDecimal);
      if (!isPassDailyQuota) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(
          dataLock.id,
          dataLock.retry,
          EEventStatus.FAILED,
          EError.OVER_DAILY_QUOTA,
        );
        return;
      }
      // const gasFee = await this.ethBridgeContract.getEstimateGas(
      //   tokenReceivedAddress,
      //   BigNumber(amountReceive),
      //   txHashLock,
      //   receiveAddress,
      //   0,
      // );
      const protocolFee = calculateFee(amountReceive, FIXED_ESTIMATE_GAS, configTip.tip);
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
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.PROCESSING);
      } else {
        this.logger.log(EError.INVALID_SIGNATURE, result.error);
        await this.eventLogRepository.updateStatusAndRetryEvenLog(
          dataLock.id,
          Number(dataLock.retry + 1),
          EEventStatus.FAILED,
          result.error,
        );
      }
      return result;
    } catch (error) {
      this.logger.log(EError.INVALID_SIGNATURE, error);
      await this.eventLogRepository.updateStatusAndRetryEvenLog(
        dataLock.id,
        Number(dataLock.retry + 1),
        EEventStatus.FAILED,
        error,
      );
    }
  }

  async handleValidateUnlockTxEVM() {
    let dataLock, configTip, wallet;
    const privateKey = this.configService.get<string>(EEnvKey.SIGNER_PRIVATE_KEY);
    wallet = new ethers.Wallet(privateKey);
    try {
      [dataLock, configTip] = await Promise.all([
        this.eventLogRepository.getValidatorPendingSignature(wallet.address, ENetworkName.ETH),
        this.commonConfigRepository.getCommonConfig(),
      ]);

      if (!dataLock) {
        return;
      }

      const { tokenReceivedAddress, tokenFromAddress, txHashLock, receiveAddress, senderAddress, amountFrom } =
        dataLock;

      const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);

      if (!tokenPair) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(
          dataLock.id,
          dataLock.retry,
          EEventStatus.NOTOKENPAIR,
        );
        return;
      }

      const amountReceive = BigNumber(amountFrom)
        .dividedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.fromDecimal))
        .multipliedBy(BigNumber(DECIMAL_BASE).pow(tokenPair.toDecimal))
        .toString();

      // const gasFee = await this.ethBridgeContract.getEstimateGas(
      //   tokenReceivedAddress,
      //   BigNumber(amountReceive),
      //   txHashLock,
      //   receiveAddress,
      //   0,
      // );
      const protocolFee = calculateFee(amountReceive, FIXED_ESTIMATE_GAS, configTip.tip);

      const signTx = await this.getSignature(
        wallet,
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
        {
          token: tokenReceivedAddress,
          amount: amountReceive,
          user: receiveAddress,
          hash: txHashLock,
          fee: protocolFee.toString(),
        },
      );

      // const result = await this.ethBridgeContract.unlock(
      //   tokenReceivedAddress,
      //   BigNumber(amountReceive),
      //   txHashLock,
      //   '0x5321e004589a3f7cafcF8E2802c3c569A74DEac2',
      //   BigNumber(protocolFee),
      //   [signTx.signature],
      // );
      await this.multiSignatureRepository.save(
        new MultiSignature({
          chain: ENetworkName.ETH,
          signature: signTx.signature,
          validator: wallet.address,
          txId: dataLock.id,
        }),
      );
    } catch (error) {
      this.logger.log(EError.INVALID_SIGNATURE, error);
      await this.multiSignatureRepository.upsertErrorAndRetryMultiSignature(wallet.address, dataLock.id, error);

    }
  }

  private async isPassDailyQuota(address: string, fromDecimal: number): Promise<boolean> {
    const [dailyQuota, totalamount] = await Promise.all([
      await this.commonConfigRepository.getCommonConfig(),
      await this.eventLogRepository.sumAmountBridgeOfUserInDay(address),
    ]);

    if (
      totalamount &&
      BigNumber(totalamount.totalamount).isGreaterThan(addDecimal(dailyQuota.dailyQuota, fromDecimal))
    ) {
      return false;
    }
    return true;
  }

  private async getSignature(
    wallet: ethers.Wallet,
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>,
  ) {
    const signature = await wallet._signTypedData(domain, types, value);

    return { signature, payload: { domain, type: types, data: value } };
  }

}
