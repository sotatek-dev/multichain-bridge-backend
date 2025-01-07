import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isNotEmpty } from 'class-validator';
import { FungibleToken, FungibleTokenAdmin } from 'mina-fungible-token';
import { AccountUpdate, Bool, fetchAccount, Mina, PrivateKey, PublicKey, UInt8 } from 'o1js';
import { IsNull } from 'typeorm';

import { ETokenPairStatus } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { EJobPriority, EQueueName } from '../../constants/queue.constant.js';
import { CommonConfigRepository } from '../../database/repositories/common-configuration.repository.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { QueueService } from '../../shared/modules/queue/queue.service.js';
import { ETHBridgeContract } from '../../shared/modules/web3/web3.service.js';
import { ISenderJobPayload } from './interfaces/job.interface.js';

@Injectable()
export class TokenDeployer {
  constructor(
    private readonly ethBridgeContract: ETHBridgeContract,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    private readonly tokenPairRepo: CommonConfigRepository,
    private readonly loggerService: LoggerService,
  ) {}
  private readonly logger = this.loggerService.getLogger('DEPLOY_TOKEN_SERVICE');
  public async deployTokenEth(tokenPairId: number) {
    const tokenInfo = await this.tokenPairRepo.findOneBy({ id: tokenPairId });
    if (!tokenInfo) {
      this.logger.info('Token not found', tokenPairId);
      return;
    }
    try {
      await this.ethBridgeContract.whitelistToken(tokenInfo.fromAddress);
      await this.tokenPairRepo.update(
        { id: tokenPairId },
        {
          status: ETokenPairStatus.ENABLE,
        },
      );
    } catch (error) {
      this.logger.error(error);
      await this.tokenPairRepo.update(
        { id: tokenPairId },
        {
          status: ETokenPairStatus.DEPLOY_FAILED,
        },
      );
    }
  }
  public async deployTokenMina(tokenPairId: number) {
    const tokenInfo = await this.tokenPairRepo.findOneBy({ id: tokenPairId });
    if (!tokenInfo) {
      this.logger.info('Token not found', tokenPairId);
      return;
    }
    if (isNotEmpty(tokenInfo.toAddress)) {
      this.logger.info(`token is already deployed`);
      // must try invoke eth sender job
      await this.addJobWhitelistTokenEth(tokenPairId);
      return;
    }
    const src = 'https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts';
    const MINAURL = this.configService.get(EEnvKey.MINA_BRIDGE_RPC_OPTIONS);
    const ARCHIVEURL = this.configService.get(EEnvKey.MINA_BRIDGE_ARCHIVE_RPC_OPTIONS);

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

    this.logger.info('feePayerPrivateKey', feePayerPrivateKey.toPublicKey().toBase58());

    let sentTx;
    try {
      const tx = await Mina.transaction({ sender: feePayerPrivateKey.toPublicKey(), fee }, async () => {
        AccountUpdate.fundNewAccount(feePayerPrivateKey.toPublicKey(), 3);
        await tokenAdminContract.deploy({
          adminPublicKey: PublicKey.fromBase58(this.configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS)!),
        });
        await token.deploy({
          symbol: tokenInfo.asset,
          src: src,
        });
        await token.initialize(tokenAdminContractPrivateKey.toPublicKey(), UInt8.from(9), Bool(false));
      });
      await tx.prove();
      sentTx = await tx.sign([feePayerPrivateKey, tokenAdminContractPrivateKey, tokenPrivateKey]).send();
      this.logger.info('=====================txhash: ', sentTx?.hash);
      await sentTx?.wait({ maxAttempts: 300 });
    } catch (err) {
      this.logger.error(err);
      await this.tokenPairRepo.update(
        { id: tokenPairId, toAddress: IsNull() },
        {
          status: ETokenPairStatus.DEPLOY_FAILED,
        },
      );
      return; // terminate the job
    }

    // Save all private and public keys to a single JSON file
    const keysToSave = [
      { name: 'token', privateKey: tokenPrivateKey.toBase58(), publicKey: tokenPrivateKey.toPublicKey().toBase58() },
      {
        name: 'tokenAdminContract',
        privateKey: tokenAdminContractPrivateKey.toBase58(),
        publicKey: tokenAdminContractPrivateKey.toPublicKey().toBase58(),
      },
    ];
    this.logger.info(keysToSave);
    // save to db
    await this.tokenPairRepo.update(
      { id: tokenPairId, toAddress: IsNull() },
      {
        toScAddress: tokenPrivateKey.toPublicKey().toBase58(),
      },
    );
    await this.addJobWhitelistTokenEth(tokenPairId);
  }

  public addJobDeployTokenMina(tokenPairId: number) {
    return this.queueService.addJobToQueue<ISenderJobPayload>(
      EQueueName.MINA_SENDER_QUEUE,
      {
        type: 'deploy-token',
        payload: {
          tokenPairId,
        },
      },
      {
        jobId: `deploy-token-${tokenPairId}`,
        removeOnComplete: true,
        removeOnFail: true,
        priority: EJobPriority.DEPLOY_TOKEN,
      },
    );
  }
  private addJobWhitelistTokenEth(tokenPairId: number) {
    return this.queueService.addJobToQueue<ISenderJobPayload>(
      EQueueName.EVM_SENDER_QUEUE,
      {
        type: 'deploy-token',
        payload: {
          tokenPairId,
        },
      },
      {
        jobId: `deploy-token-${tokenPairId}`,
        removeOnComplete: true,
        removeOnFail: true,
        priority: EJobPriority.DEPLOY_TOKEN,
      },
    );
  }
}
