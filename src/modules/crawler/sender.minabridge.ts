import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EError } from '@constants/error.constant';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { Mina, PublicKey, Experimental, fetchAccount, PrivateKey, UInt64, AccountUpdate } from 'o1js';
import { Token } from './erc20.js';
import { Bridge } from './bridgeSC.js';
import { ConfigService } from '@nestjs/config';
import { EEnvKey } from '@constants/env.constant';
import BigNumber from 'bignumber.js';

@Injectable()
export class SenderMinaBridge {
  constructor(
    private readonly configService: ConfigService,
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
  ) {}

  public async handleUnlockMina() {
    try {
      const [ dataLock, configTip ] = await Promise.all([
        this.eventLogRepository.getEventLockWithNetwork(ENetworkName.MINA),
        this.commonConfigRepository.getCommonConfig()
      ]) 

      const { tokenReceivedAddress, id, receiveAddress, amountFrom } = dataLock
      // const protocolFee = calculateFee(amountFrom, 0 , addDecimal(this.configService.get(EEnvKey.GASFEEMINA), 18), configTip.tip)
      
      const isPassDailyQuota = await this.isPassDailyQuota(receiveAddress);
      if(!isPassDailyQuota) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.FAILED, EError.OVER_DAILY_QUOTA);
        return ;
      }

      const result = await this.callUnlockFunction(amountFrom, id, receiveAddress)


      //Update status eventLog when call function unlock
      if (result.success) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.PROCESSING, result.error, result.data);
      } else {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry + 1), EEventStatus.FAILED, result.error);
      }
    } catch (error) {
      
    }    
    
  }

  private async callUnlockFunction(amount, txId, receiveAddress) {
    try {      
      await Token.compile();
      await Bridge.compile();
      const Berkeley = Mina.Network(this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS));
      Mina.setActiveInstance(Berkeley);

      // call update() and send transaction
      let feepayerKey = PrivateKey.fromBase58(this.configService.get(EEnvKey.SIGNER_MINA_PRIVATE_KEY));
      let feepayerAddress = feepayerKey.toPublicKey();
      let zkBridgeAddress = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS));
      let zkAppAddress = PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS));
      let receiveiAdd = PublicKey.fromBase58(receiveAddress);
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

      let tx = await Mina.transaction({ sender: feepayerAddress, fee: transactionFee }, async () => {
        if(!hasAccount) AccountUpdate.fundNewAccount(feepayerAddress);
        const callback = Experimental.Callback.create(bridgeApp, "unlock", [zkAppAddress, UInt64.from(amount), receiveiAdd, UInt64.from(txId)]);
        zkApp.sendTokensFromZkApp(receiveiAdd, UInt64.from(amount), callback);
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

  private async isPassDailyQuota(address: string): Promise<boolean> {
    const [dailyQuota , totalamount] = await Promise.all([
      await this.commonConfigRepository.getCommonConfig(),
      await this.eventLogRepository.sumAmountBridgeOfUserInDay(address)
    ])

    if(totalamount && totalamount.totalamount > dailyQuota.dailyQuota) {
      return false
    }
    return true
  }
}

