import { ConfigService } from '@nestjs/config';
import { Command, Console } from 'nestjs-console';

import { EEnvKey } from '../../constants/env.constant.js';
import { EQueueName, getEvmValidatorQueueName, getMinaValidatorQueueName } from '../../constants/queue.constant.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { QueueService } from '../../shared/modules/queue/queue.service.js';
import { sleep } from '../../shared/utils/promise.js';
import { BlockchainEVMCrawler } from './crawler.evmbridge.js';
import { SCBridgeMinaCrawler } from './crawler.minabridge.js';
import { IGenerateSignature, IUnlockToken } from './interfaces/job.interface.js';
import { JobUnlockProvider } from './job-unlock.provider.js';
import { SenderEVMBridge } from './sender.evmbridge.js';
import { SenderMinaBridge } from './sender.minabridge.js';

@Console()
export class CrawlerConsole {
  constructor(
    private readonly configService: ConfigService,
    private blockchainEVMCrawler: BlockchainEVMCrawler,
    private scBridgeMinaCrawler: SCBridgeMinaCrawler,
    private senderEVMBridge: SenderEVMBridge,
    private senderMinaBridge: SenderMinaBridge,
    private readonly loggerService: LoggerService,
    private readonly queueService: QueueService,
    private readonly unlockProviderService: JobUnlockProvider,
  ) {}
  private readonly logger = this.loggerService.getLogger('CRAWLER_CONSOLE');

  @Command({
    command: 'crawl-eth-bridge-contract',
    description: 'Crawl ETH Bridge contract',
  })
  async handleCrawlETHBridge() {
    try {
      while (true) {
        await this.blockchainEVMCrawler.handleEventCrawlBlock();
        await sleep(15);
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Command({
    command: 'validate-eth-bridge-unlock',
    description: 'validate ETH Bridge unlock',
  })
  async handleValidateEthLockTx() {
    const thisValidatorIndex = this.configService.get(EEnvKey.THIS_VALIDATOR_INDEX);
    this.logger.info(`EVM_VALIDATOR_JOB_${thisValidatorIndex}: started`);
    await this.queueService.handleQueueJob<IGenerateSignature>(
      getEvmValidatorQueueName(thisValidatorIndex),
      (data: IGenerateSignature) => {
        return this.senderEVMBridge.validateUnlockEVMTransaction(data.eventLogId);
      },
      10,
    );
  }

  @Command({
    command: 'validate-mina-bridge-unlock',
    description: 'validate MINA Bridge unlock',
  })
  async handleValidateMinaLockTx() {
    const thisValidatorIndex = this.configService.get(EEnvKey.THIS_VALIDATOR_INDEX);
    this.logger.info(`MINA_VALIDATOR_JOB_${thisValidatorIndex}: started`);
    await this.queueService.handleQueueJob<IGenerateSignature>(
      getMinaValidatorQueueName(thisValidatorIndex),
      (data: IGenerateSignature) => {
        return this.senderMinaBridge.handleValidateUnlockTxMina(data.eventLogId);
      },
      10,
    );
  }

  @Command({
    command: 'sender-eth-bridge-unlock',
    description: 'sender ETH Bridge unlock',
  })
  async handleSenderETHBridgeUnlock() {
    this.logger.info('MINA_SENDER_JOB: started');
    await this.queueService.handleQueueJob<IUnlockToken>(EQueueName.EVM_SENDER_QUEUE, (data: IUnlockToken) => {
      return this.senderEVMBridge.handleUnlockEVM(data.eventLogId);
    });
  }

  @Command({
    command: 'crawl-mina-bridge-contract',
    description: 'crawl Mina Bridge Contract',
  })
  async handleCrawlMinaBridge() {
    try {
      while (true) {
        await this.scBridgeMinaCrawler.handleEventCrawlBlock();
        await sleep(15);
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Command({
    command: 'sender-mina-bridge-unlock',
    description: 'sender Mina Bridge unlock',
  })
  async handleSenderMinaBridgeUnlock() {
    this.logger.info('MINA_SENDER_JOB: started');
    await this.queueService.handleQueueJob<IUnlockToken>(EQueueName.MINA_SENDER_QUEUE, (data: IUnlockToken) => {
      return this.senderMinaBridge.handleUnlockMina(data.eventLogId);
    });
  }
  @Command({
    command: 'unlock-job-provider',
    description: 'handle all network unlock.',
  })
  async handleUnlockJobProvider() {
    this.logger.info('UNLOCK_JOB_PROVIDER: started');
    await this.queueService.handleQueueJob(EQueueName.UNLOCK_JOB_QUEUE, data => {
      return this.unlockProviderService.handleJob(data);
    });
  }
}
