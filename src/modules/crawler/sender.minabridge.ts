import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import BigNumber from 'bignumber.js';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';
import { fetchAccount, Mina, PrivateKey, UInt64 } from 'o1js';

import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EEnvKey } from '@constants/env.constant';
import { EError } from '@constants/error.constant';

import { addDecimal, calculateFee } from '@shared/utils/bignumber';

import { FungibleToken } from './minaSc/fungibleToken';
import { Bridge } from './minaSc/minaBridgeSC';

@Injectable()
export class SenderMinaBridge {
  constructor(
    private readonly configService: ConfigService,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly tokenPairRepository: TokenPairRepository,
    private readonly tokenPriceRepository: TokenPriceRepository,
  ) {}

  public async handleUnlockMina() {
    let dataLock, configTip, rateethmina;
    try {
      [dataLock, configTip, { rateethmina }] = await Promise.all([
        this.eventLogRepository.getEventLockWithNetwork(ENetworkName.MINA),
        this.commonConfigRepository.getCommonConfig(),
        this.tokenPriceRepository.getRateETHToMina(),
      ]);
      if (!dataLock) {
        return;
      }
      await this.eventLogRepository.updateLockEvenLog(dataLock.id, EEventStatus.PROCESSING);

      const { tokenReceivedAddress, tokenFromAddress, id, receiveAddress, amountFrom, senderAddress } = dataLock;
      const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);

      if (!tokenPair) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(
          dataLock.id,
          dataLock.retry,
          EEventStatus.NOTOKENPAIR,
        );
        return;
      }

      const amountReceiveConvert = BigNumber(amountFrom)
        .dividedBy(BigNumber(10).pow(tokenPair.fromDecimal))
        .multipliedBy(BigNumber(10).pow(tokenPair.toDecimal))
        .toString();
      const protocolFeeAmount = calculateFee(
        amountReceiveConvert,
        addDecimal(this.configService.get(EEnvKey.GASFEEMINA), this.configService.get(EEnvKey.DECIMAL_TOKEN_MINA)),
        configTip.tip,
      );
      const amountReceive = BigNumber(amountReceiveConvert).minus(protocolFeeAmount).toString();
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

      const rateMINAETH = Number(rateethmina.toFixed(0)) || 2000;
      const result = await this.callUnlockFunction(amountReceive, id, receiveAddress, protocolFeeAmount, rateMINAETH);
      //Update status eventLog when call function unlock
      if (result.success) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(
          dataLock.id,
          dataLock.retry,
          EEventStatus.PROCESSING,
          result.error,
          result.data,
          protocolFeeAmount,
        );
      } else {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry + 1), EEventStatus.FAILED, result.error);
      }
    } catch (error) {
      await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry + 1), EEventStatus.FAILED, error);
    }
  }

  private async callUnlockFunction(amount, txId, receiveAddress, protocolFeeAmount, rateMINAETH) {
    try {
      const feepayerKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.SIGNER_MINA_PRIVATE_KEY));
      const zkAppKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_SC_PRIVATE_KEY));
      const MINAURL = 'https://proxy.devnet.minaexplorer.com/graphql';
      const ARCHIVEURL = 'https://api.minascan.io/archive/devnet/v1/graphql/';
      //
      const network = Mina.Network({
        mina: MINAURL,
        archive: ARCHIVEURL,
      });
      Mina.setActiveInstance(network);

      console.log('compile the contract...');
      await Bridge.compile();
      await FungibleToken.compile();

      const fee = protocolFeeAmount *  rateMINAETH// in nanomina (1 billion = 1.0 mina)
      const feepayerAddress = feepayerKey.toPublicKey();
      const zkAppAddress = zkAppKey.toPublicKey();
      const zkBridge = new Bridge(zkAppAddress);
      await fetchAccount({ publicKey: zkAppAddress });
      await fetchAccount({ publicKey: feepayerAddress });

      let sentTx;
      // compile the contract to create prover keys
      try {
        // call update() and send transaction
        console.log('build transaction and create proof...');
        const tx = await Mina.transaction({ sender: feepayerAddress, fee }, async () => {
          // AccountUpdate.fundNewAccount(feepayerAddress, 1);
          await zkBridge.unlock(UInt64.from(amount), feepayerAddress, UInt64.from(txId));
        });
        await tx.prove();
        console.log('send transaction...');
        sentTx = await tx.sign([feepayerKey, zkAppKey]).send();
      } catch (err) {
        console.log(err);
      }
      console.log('=====================txhash: ', sentTx?.hash);
      await sentTx?.wait();

      if (sentTx.hash) {
        return { success: true, error: null, data: sentTx.hash };
      } else {
        return { success: false, error: sentTx, data: null };
      }
    } catch (error) {
      console.log(error);
      return { success: false, error, data: null };
    }
  }

  private async isPassDailyQuota(address: string, fromDecimal: number): Promise<boolean> {
    const [dailyQuota, totalamount] = await Promise.all([
      await this.commonConfigRepository.getCommonConfig(),
      await this.eventLogRepository.sumAmountBridgeOfUserInDay(address),
    ]);

    if (
      totalamount &&
      BigNumber(totalamount.totalamount).isGreaterThanOrEqualTo(addDecimal(dailyQuota.dailyQuota, fromDecimal))
    ) {
      return false;
    }
    return true;
  }

  private async fetchNonce(feepayerAddress) {
    console.log('nonce=======', feepayerAddress);
    const url = 'https://proxy.berkeley.minaexplorer.com/graphql';
    const query = `
    query {
      account(publicKey: "${feepayerAddress}") {
        inferredNonce
      }
    }
    `;
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ operationName: null, query, variables: {} }),
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await response.json();
    console.log('nonce=======', json);

    const inferredNonce = Number(json.data.account.inferredNonce);
    return inferredNonce;
  }

  private tweakMintPrecondition(token: FungibleToken, mempoolMintAmount: number) {
    // here we take `circulating` variable from state slot with index 3 and increase it by `mempoolMintAmount`
    const prevPreconditionVal = token.self.body.preconditions.account.state[3]!.value;
    token.self.body.preconditions.account.state[3]!.value = prevPreconditionVal.add(mempoolMintAmount);
  }
}
