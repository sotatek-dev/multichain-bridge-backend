import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EError } from '@constants/error.constant';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';

import { Mina, PublicKey, Experimental, fetchAccount, PrivateKey, UInt64, AccountUpdate } from 'o1js';
import { Token } from './minaTokenErc20.js';
import { Bridge } from './minaBridgeSC.js';
import { ConfigService } from '@nestjs/config';
import { EEnvKey } from '@constants/env.constant';
import BigNumber from 'bignumber.js';
import { addDecimal, calculateFee } from '@shared/utils/bignumber';

@Injectable()
export class SenderMinaBridge {
  constructor(
    private readonly configService: ConfigService,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
    private readonly tokenPairRepository: TokenPairRepository,

  ) {}

  public async handleUnlockMina() {
    try {
      const [ dataLock, configTip ] = await Promise.all([
        this.eventLogRepository.getEventLockWithNetwork(ENetworkName.MINA),
        this.commonConfigRepository.getCommonConfig()
      ])

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

      const result = await this.callUnlockFunction(amountReceive, id, receiveAddress, protocolFeeAmount)


      //Update status eventLog when call function unlock
      if (result.success) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.PROCESSING, result.error, result.data);
      } else {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry + 1), EEventStatus.FAILED, result.error);
      }
    } catch (error) {
      console.log(error);
      
    }    
    
  }

  private async callUnlockFunction(amount, txId, receiveAddress, protocolFeeAmount) {
    try {      
      await Token.compile();
      await Bridge.compile();
      const Berkeley = Mina.Network(`${this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS)}`);
      Mina.setActiveInstance(Berkeley);

      // call update() and send transaction
      let feepayerKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.SIGNER_MINA_PRIVATE_KEY));
      let feepayerAddress = feepayerKey.toPublicKey();
      let zkBridgeAddress = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS));
      let zkAppAddress = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS));
      let receiveiAdd = PublicKey.fromBase58(receiveAddress);
      let protocolFeeAddress = PublicKey.fromBase58(this.configService.get(EEnvKey.FEE_MINA_ADDRESS));
      let zkApp = new Token(zkAppAddress);

      const bridgeApp = new Bridge(zkBridgeAddress, zkApp.token.id);
      const transactionFee = 1_000_000_000;
      console.log('build transaction and create proof...');

      try {
        await fetchAccount({ publicKey: feepayerAddress });
      }
      catch (e) {
        console.log(e);
      }

      const tokenId = zkApp.token.id
      await fetchAccount({ publicKey: receiveiAdd, tokenId });
      const hasAccount = Mina.hasAccount(receiveiAdd, tokenId);

      let tx = await Mina.transaction({ sender: feepayerAddress, fee: protocolFeeAmount }, async () => {
        if(!hasAccount) AccountUpdate.fundNewAccount(feepayerAddress);
        const callback = Experimental.Callback.create(bridgeApp, "unlock", [zkAppAddress, UInt64.from(amount), receiveiAdd, UInt64.from(txId)]);
        zkApp.sendTokensFromZkApp(receiveiAdd, UInt64.from(amount), callback);
        const callbackFee = Experimental.Callback.create(bridgeApp, "unlock", [zkAppAddress, UInt64.from(protocolFeeAmount), protocolFeeAddress, UInt64.from(txId)]);
        zkApp.sendTokensFromZkApp(protocolFeeAddress, UInt64.from(protocolFeeAmount), callbackFee);
      });
      await tx.prove();
      console.log('send transaction...');
      let sentTx = await tx.sign([feepayerKey]).send();
      console.log('transaction=======', sentTx.hash());
      return { success: true, error: null, data: sentTx.hash() };
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
}

