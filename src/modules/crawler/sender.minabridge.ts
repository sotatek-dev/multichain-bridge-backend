import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { Mina, PublicKey, SmartContract, UInt32, fetchAccount, PrivateKey, fetchLastBlock } from 'o1js';
import { TestEvent } from './add.js';

@Injectable()
export class SenderMinaBridge {
  constructor(
    private readonly eventLogRepository: EventLogRepository,
  ) {}

  public async handleUnlockMina() {
    try {
      const dataLock = await this.eventLogRepository.getEventLockWithNetwork(ENetworkName.MINA);
      const { tokenReceivedAddress, txHashLock, receiveAddress, amountFrom } = dataLock
      
      const result = await this.callUnlockFunction(dataLock)

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
      await TestEvent.compile();
      const Berkeley = Mina.Network('https://api.minascan.io/node/berkeley/v1/graphql');
      Mina.setActiveInstance(Berkeley);
      // call update() and send transaction
      const sender = PublicKey.fromBase58('B62qnkLnB7BWZ8xWbjnBMK3Ezictna56LqTdJA9ijaK3kL87QEAddBk');
      const senderPrivateKey = PrivateKey.fromBase58('EKEad1TfhBC3F83U9Nhduu79TkxHPSCK5rGSYRJ6EpMiEtLCwMSu');
      let zkappAddress = PublicKey.fromBase58('B62qm7xwx5pp9kgtPSsAQrm99fBUzwcPoG6EWWqG7b8mnZ8UoKgevjd');
      const zkApp = new TestEvent(zkappAddress);
      const transactionFee = 1_000_000_000;
      console.log('build transaction and create proof...');
      let tx = await Mina.transaction({ sender: sender, fee: transactionFee}, () => {
        zkApp.update();
      });
      console.log("==========", tx.toJSON());
  
      await tx.prove();
      // console.log(tx.toPretty());
      console.log('send transaction...');
      const pendingTx = await tx.sign([senderPrivateKey]).send();
      console.log('transaction=======', pendingTx.hash());
      await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, dataLock.retry, EEventStatus.PROCESSING);
      
      // pvk: EKEad1TfhBC3F83U9Nhduu79TkxHPSCK5rGSYRJ6EpMiEtLCwMSu
      // public key: B62qnkLnB7BWZ8xWbjnBMK3Ezictna56LqTdJA9ijaK3kL87QEAddBk
      // return { success: true, error: null, data: pendingTx };
    } catch (error) {
      await this.eventLogRepository.updateStatusAndRetryEvenLog(dataLock.id, Number(dataLock.retry + 1), EEventStatus.FAILED);
      // return { success: false, error, data: null };
    }
  }
}

