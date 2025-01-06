import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FungibleToken, FungibleTokenAdmin } from 'mina-fungible-token';
import { AccountUpdate, Bool, fetchAccount, Mina, PrivateKey, PublicKey, UInt8 } from 'o1js';

import { EEnvKey } from '../../constants/env.constant.js';
import { ETHBridgeContract } from '../../shared/modules/web3/web3.service.js';

@Injectable()
export class TokenDeployer {
  constructor(
    private readonly ethBridgeContract: ETHBridgeContract,
    private readonly configService: ConfigService,
  ) {}
  private async deployTokenEth(tokenAddress: string): Promise<string> {
    const res = await this.ethBridgeContract.whitelistToken(tokenAddress);

    return res.tokenAddress;
  }
  private async deployTokenMina() {
    const src = 'https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts';
    const MINAURL = 'https://proxy.devnet.minaexplorer.com/graphql';
    const ARCHIVEURL = 'https://api.minascan.io/archive/devnet/v1/graphql/';

    const network = Mina.Network({
      mina: MINAURL,
      archive: ARCHIVEURL,
    });
    Mina.setActiveInstance(network);

    // compile contract
    await FungibleToken.compile();
    await FungibleTokenAdmin.compile();

    const feePayerPrivateKey = PrivateKey.fromBase58('EKFQWW89p2oVCd8yfM5SYVUGCiSMAByQ3yWzegLVz2cvcqMPJXgQ'); // a minter
    const tokenPrivateKey = PrivateKey.random();
    const tokenAdminContractPrivateKey = PrivateKey.random();

    const fee = +this.configService.get(EEnvKey.BASE_MINA_BRIDGE_FEE); // in nanomina (1 billion = 1.0 mina)

    await Promise.all([fetchAccount({ publicKey: feePayerPrivateKey.toPublicKey() })]);

    const token = new FungibleToken(tokenPrivateKey.toPublicKey());
    const tokenAdminContract = new FungibleTokenAdmin(tokenAdminContractPrivateKey.toPublicKey());

    console.log('feePayerPrivateKey', feePayerPrivateKey.toPublicKey().toBase58());

    let sentTx;
    try {
      // call update() and send transaction
      console.log('Deploying...');
      const tx = await Mina.transaction({ sender: feePayerPrivateKey.toPublicKey(), fee }, async () => {
        AccountUpdate.fundNewAccount(feePayerPrivateKey.toPublicKey(), 3);
        await tokenAdminContract.deploy({
          adminPublicKey: PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS)!),
        });
        await token.deploy({
          symbol: 'symbol',
          src: src,
        });
        await token.initialize(tokenAdminContractPrivateKey.toPublicKey(), UInt8.from(9), Bool(false));
      });
      console.log('prove transaction...');
      await tx.prove();
      console.log('send transaction...');
      sentTx = await tx.sign([feePayerPrivateKey, tokenAdminContractPrivateKey, tokenPrivateKey]).send();
    } catch (err) {
      console.log(err);
    }
    console.log('=====================txhash: ', sentTx?.hash);
    await sentTx?.wait();
    // Save all private and public keys to a single JSON file
    const keysToSave = [
      { name: 'token', privateKey: tokenPrivateKey.toBase58(), publicKey: tokenPrivateKey.toPublicKey().toBase58() },
      {
        name: 'tokenAdminContract',
        privateKey: tokenAdminContractPrivateKey.toBase58(),
        publicKey: tokenAdminContractPrivateKey.toPublicKey().toBase58(),
      },
    ];
    console.log(keysToSave);
  }

  public async deployNewToken() {
    await this.deployTokenMina();
  }
}
