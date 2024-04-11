import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EError } from '@constants/error.constant';
import { ConfigService } from '@nestjs/config';
import { EEnvKey } from '@constants/env.constant';
import BigNumber from 'bignumber.js';
import { addDecimal, calculateFee } from '@shared/utils/bignumber';

import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';

import { Mina, PublicKey, Experimental, fetchAccount, PrivateKey, UInt64, AccountUpdate } from 'o1js';
import { Bridge } from './minaSc/minaBridgeSC.js';
// import { FungibleToken } from './node_modules/mina-fungible-token/FungibleToken.js';
// import { FungibleToken } from '../../../node_modules/mina-fungible-token/FungibleToken.js';
import { FungibleToken } from './minaSc/fungibleToken.js';
@Injectable()
export class SenderMinaBridge {
  constructor(
    private readonly configService: ConfigService,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly tokenPairRepository: TokenPairRepository,
    private readonly tokenPriceRepository: TokenPriceRepository

  ) {}

  public async handleUnlockMina() {
    let dataLock, configTip, rateethmina;
    try {
      [ dataLock, configTip, { rateethmina } ] = await Promise.all([
        this.eventLogRepository.getEventLockWithNetwork(ENetworkName.MINA),
        this.commonConfigRepository.getCommonConfig(),
        this.tokenPriceRepository.getRateETHToMina()
      ])
      if(!dataLock) {
        return;
      }
      await this.eventLogRepository.updateLockEvenLog(dataLock.id, EEventStatus.PROCESSING);

      const { tokenReceivedAddress, tokenFromAddress, id, receiveAddress, amountFrom, senderAddress } = dataLock
      const tokenPair = await this.tokenPairRepository.getTokenPair(tokenFromAddress, tokenReceivedAddress);
      if(!tokenPair) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.NOTOKENPAIR);
        return;
      }
      
      const amountReceiveConvert = BigNumber(amountFrom).dividedBy(BigNumber(10).pow(tokenPair.fromDecimal)).multipliedBy(BigNumber(10).pow(tokenPair.toDecimal)).toString();
      const protocolFeeAmount = calculateFee(amountReceiveConvert, addDecimal(this.configService.get(EEnvKey.GASFEEMINA), this.configService.get(EEnvKey.DECIMAL_TOKEN_MINA)), configTip.tip)
      const amountReceive = BigNumber(amountReceiveConvert).minus(protocolFeeAmount).toString();
      const isPassDailyQuota = await this.isPassDailyQuota(senderAddress, tokenPair.fromDecimal);
      if(!isPassDailyQuota) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.FAILED, EError.OVER_DAILY_QUOTA);
        return ;
      }

      const rateMINAETH = Number(rateethmina.toFixed(0)) || 2000;
      const result = await this.callUnlockFunction(amountReceive, id, receiveAddress, protocolFeeAmount, rateMINAETH)
      //Update status eventLog when call function unlock
      if (result.success) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.PROCESSING, result.error, result.data, protocolFeeAmount);
      } else {
        // await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry + 1), EEventStatus.FAILED, result.error);
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry), EEventStatus.FAILED, result.error);
      }
    } catch (error) {
      // await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry + 1), EEventStatus.FAILED, error);
      await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry), EEventStatus.FAILED, error);
    }    
    
  }

  private async callUnlockFunction(amount, txId, receiveAddress, protocolFeeAmount, rateMINAETH) {
    try {   
      console.log('================unlock', receiveAddress);
    
      const MINAURL = 'https://proxy.berkeley.minaexplorer.com/graphql';
      const ARCHIVEURL = 'https://api.minascan.io/archive/berkeley/v1/graphql/';
      //
      const network = Mina.Network({
        mina: MINAURL,
        archive: ARCHIVEURL,
      });
      Mina.setActiveInstance(network);

      await Bridge.compile();
      await FungibleToken.compile();
      // const Berkeley = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
      // Mina.setActiveInstance(Berkeley);

      // call update() and send transaction
      console.log('acount======', this.configService.get(EEnvKey.SIGNER_MINA_PRIVATE_KEY));
      
      let feepayerKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.SIGNER_MINA_PRIVATE_KEY));
      let feepayerAddress = feepayerKey.toPublicKey();
      let zkBridgeAddress = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS));
      let zkAppKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_SC_PRIVATE_KEY));
      // let zkAppKey = PrivateKey.fromBase58('EKEYE13gRys9tS8EhTgX4X1YNi7f12PSRPucDFdBYMfmNGboVbsc');
      // let tokenAddress = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS));
      // let receiveiAdd = PublicKey.fromBase58(receiveAddress);

      const zkBridge = new Bridge(zkBridgeAddress);
      // const tokenApp = new FungibleToken(tokenAddress)
      console.log('build transaction and create proof...');

      try {
        // await fetchAccount({ publicKey: zkBridgeAddress });
        // await fetchAccount({publicKey: feepayerAddress});
        // await fetchAccount({ publicKey: receiveiAdd, tokenId: tokenApp.deriveTokenId() });
      }
      catch (error) {
        console.log("erorrr====== day",error);
        return { success: false, error, data: null };
      }

      const hasAccount = Mina.hasAccount(feepayerAddress);

      const fee = Number(1) * 1e9;
      let tx = await Mina.transaction({ sender: feepayerAddress, fee }, async () => {
        if(!hasAccount) AccountUpdate.fundNewAccount(feepayerAddress, 1);
        zkBridge.unlock(UInt64.from(amount), feepayerAddress, UInt64.from(txId));
      });
      await tx.prove();

      console.log('send transaction...');
      let sentTx = await tx.sign([feepayerKey, zkAppKey]).send();
      console.log('transaction=======', sentTx);
      await sentTx.wait();

      if(sentTx.hash) {
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
    const [dailyQuota , totalamount] = await Promise.all([
      await this.commonConfigRepository.getCommonConfig(),
      await this.eventLogRepository.sumAmountBridgeOfUserInDay(address)
    ])

    if(totalamount && BigNumber(totalamount.totalamount).isGreaterThanOrEqualTo(addDecimal(dailyQuota.dailyQuota, fromDecimal))) {
      return false
    }
    return true
  }

  private async fetchNonce(feepayerAddress) {
    console.log("nonce=======", feepayerAddress);
    const url = "https://proxy.berkeley.minaexplorer.com/graphql"
    const query = `
    query {
      account(publicKey: "${feepayerAddress}") {
        inferredNonce
      }
    }
    `
    const response = await fetch(
      url, {
        method: 'POST', 
        body: JSON.stringify({ operationName: null, query, variables: {} }),
        headers: {'Content-Type': 'application/json'}
    })
    const json = await response.json()
    console.log("nonce=======", json);
    
    const inferredNonce = Number(json.data.account.inferredNonce)
    return inferredNonce
  }

  private tweakMintPrecondition(token: FungibleToken, mempoolMintAmount: number) {
    // here we take `circulating` variable from state slot with index 3 and increase it by `mempoolMintAmount`
    const prevPreconditionVal = token.self.body.preconditions.account.state[3]!.value
    token.self.body.preconditions.account.state[3]!.value = prevPreconditionVal.add(mempoolMintAmount)
  }
}

