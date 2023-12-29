import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EError } from '@constants/error.constant';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { Mina, PublicKey, Experimental, UInt32, fetchAccount, PrivateKey, fetchLastBlock, UInt64, AccountUpdate } from 'o1js';
import { Token } from './erc20.js';
import { Bridge } from './bridgeSC.js';

@Injectable()
export class SenderMinaBridge {
  constructor(
    private readonly eventLogRepository: EventLogRepository,
    private readonly commonConfigRepository: CommonConfigRepository,
  ) {}

  public async handleUnlockMina() {
    try {
      const dataLock = await this.eventLogRepository.getEventLockWithNetwork(ENetworkName.MINA);
      const { tokenReceivedAddress, txHashLock, receiveAddress, amountFrom } = dataLock
      
      const isPassDailyQuota = await this.isPassDailyQuota(receiveAddress);
      if(!isPassDailyQuota) {
        await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.FAILED, EError.OVER_DAILY_QUOTA);
        return ;
      }
      console.log("k====================");
      
      // const result = await this.callUnlockFunction(dataLock)


      //Update status eventLog when call function unlock
      // if (result.success) {
      //   await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.DONE);
      // } else {
      //   await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry + 1), EEventStatus.FAILED);
      // }
    } catch (error) {
      
    }    
    
  }

  private async callUnlockFunction(dataLock) {
    try {
      await Token.compile();
      await Bridge.compile();
      // const Berkeley = Mina.Network('https://api.minascan.io/node/berkeley/v1/graphql');
      // Mina.setActiveInstance(Berkeley);
      const Network = Mina.Network({
        mina: 'https://api.minascan.io/node/berkeley/v1/graphql',
        archive: 'https://api.minascan.io/archive/berkeley/v1/graphql/',
        });
        Mina.setActiveInstance(Network);
      // call update() and send transaction
      let feepayerKey = PrivateKey.fromBase58('EKEfsDKm6dnAudxiJzdKeGxUni1o179GGuDLjPQn4PA3313saMvR');
      let feepayerAddress = feepayerKey.toPublicKey();
      let zkBridgeAddress = PublicKey.fromBase58('B62qjxV4QR8BETUSXzjMP19vHuqTPff563h2D338AvCQjeqXQPGhcnF');
      let zkAppAddress = PublicKey.fromBase58('B62qmPmmmFVphxQg44BGAe5gaiDqdqhzNj792UJXbaCKrmAssoYZNuS');
      const MINA = 1e18;
      let amount = UInt64.from(10 * MINA);
      // const accounts = await fetchAccount({publicKey: token});
      let zkApp = new Token(zkAppAddress);
      const bridgeApp = new Bridge(zkBridgeAddress, zkApp.token.id);
      const transactionFee = 1_000_000_000;
      console.log('build transaction and create proof...');

      try {
        const accounts = await fetchAccount({ publicKey: feepayerAddress });
      }
      catch (e) {
          console.log(e);
      }
      console.log(zkAppAddress.toBase58());
      console.log(zkBridgeAddress.toBase58());
      console.log(feepayerAddress.toBase58());
      let tx = await Mina.transaction({ sender: feepayerAddress, fee: transactionFee }, async () => {
          AccountUpdate.fundNewAccount(feepayerAddress);
          const callback = Experimental.Callback.create(bridgeApp, "unlock", [zkAppAddress, feepayerAddress, UInt64.one]);
          zkApp.sendTokensFromZkApp(feepayerAddress, UInt64.one, callback);
      });
      await tx.prove();
      console.log('send transaction...');
      let sentTx = await tx.sign([feepayerKey]).send();
      console.log('transaction=======', sentTx.hash());
        // return { success: true, error: null, data: pendingTx };
      } catch (error) {
        console.log(error)
        // await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry + 1), EEventStatus.FAILED);
        // return { success: false, error, data: null };
      }
  }

  private async isPassDailyQuota(address: string): Promise<boolean> {
    const [dailyQuota , totalamount] = await Promise.all([
      await this.commonConfigRepository.getCommonConfig(),
      await this.eventLogRepository.sumAmountBridgeOfUserInDay(address)
    ])

    if(totalamount && totalamount > dailyQuota.dailyQuota) {
      return false
    }

    return true
  }
}

