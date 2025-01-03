import { Injectable } from '@nestjs/common';
import { FungibleToken, FungibleTokenAdmin } from 'mina-fungible-token';
import { AccountUpdate, Bool, Mina, UInt8 } from 'o1js';

import { ETHBridgeContract } from '../../shared/modules/web3/web3.service.js';
import { Bridge } from './minaSc/Bridge.js';
import { Manager } from './minaSc/Manager.js';
import { ValidatorManager } from './minaSc/ValidatorManager.js';

@Injectable()
export class TokenDeployer {
  constructor(private readonly ethBridgeContract: ETHBridgeContract) {}
  private async deployTokenEth(tokenAddress: string): Promise<string> {
    const res = await this.ethBridgeContract.whitelistToken(tokenAddress);

    return res.tokenAddress;
  }
  private async deployTokenMina() {
    // const src = 'https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts';
    // const MINAURL = 'https://proxy.devnet.minaexplorer.com/graphql';
    // const ARCHIVEURL = 'https://api.minascan.io/archive/devnet/v1/graphql/';

    // const network = Mina.Network({
    //   mina: MINAURL,
    //   archive: ARCHIVEURL,
    // });
    // Mina.setActiveInstance(network);
    // const token = new FungibleToken(tokenAddress);
    // const adminContract = new FungibleTokenAdmin(adminContractAddress);
    // const bridgeContract = new Bridge(bridgeAddress);
    // const managerContract = new Manager(managerAddress);
    // const validatorManagerContract = new ValidatorManager(validatorManagerAddress);

    // let sentTx;
    // // compile the contract to create prover keys
    // // await fetchAccount({publicKey: feepayerAddress});
    // try {
    //   // call update() and send transaction
    //   console.log('Deploying...');
    //   let tx = await Mina.transaction({ sender: feepayerAddress, fee }, async () => {
    //     AccountUpdate.fundNewAccount(feepayerAddress, 3);
    //     await adminContract.deploy({ adminPublicKey: feepayerAddress });
    //     await token.deploy({
    //       symbol: symbol,
    //       src: src,
    //     });
    //     await token.initialize(adminContractAddress, UInt8.from(9), Bool(false));
    //   });
    //   console.log('prove transaction...');
    //   await tx.prove();
    //   console.log('send transaction...');
    //   sentTx = await tx.sign([feepayerKey, adminContractKey, tokenKey]).send();
    // } catch (err) {
    //   console.log(err);
    // }
    // console.log('=====================txhash: ', sentTx?.hash);
    // await sentTx?.wait();
    // // Save all private and public keys to a single JSON file
    // const keysToSave = [
    //   { name: 'token', privateKey: tokenKey, publicKey: tokenAddress },
    //   { name: 'adminContract', privateKey: adminContractKey, publicKey: adminContractAddress },
    // ];
  }

  public async deployNewToken() {}
}
