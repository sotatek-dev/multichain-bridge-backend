import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { ConfigurationModule } from '../../../config/config.module.js';
import { EAsset } from '../../../constants/api.constant.js';
import { EEventName, EEventStatus, ENetworkName } from '../../../constants/blockchain.constant.js';
import { CommonConfigRepository } from '../../../database/repositories/common-configuration.repository.js';
import { CrawlContractRepository } from '../../../database/repositories/crawl-contract.repository.js';
import { EventLogRepository } from '../../../database/repositories/event-log.repository.js';
import { MultiSignatureRepository } from '../../../database/repositories/multi-signature.repository.js';
import { TokenPairRepository } from '../../../database/repositories/token-pair.repository.js';
import { LoggerService } from '../../../shared/modules/logger/logger.service.js';
import { Web3Module } from '../../../shared/modules/web3/web3.module.js';
import { ETHBridgeContract } from '../../../shared/modules/web3/web3.service.js';
import { CommonConfig } from '../entities/common-config.entity.js';
import { EventLog } from '../entities/index.js';
import { MultiSignature } from '../entities/multi-signature.entity.js';
import { SenderEVMBridge } from '../sender.evmbridge.js';

let senderEVMBridge: SenderEVMBridge;
let eventLogRepository: EventLogRepository;
let commonConfigRepository: CommonConfigRepository;
let multiSignatureRepository: MultiSignatureRepository;
// Mock objects
const mockJwtService = {
  // Mock methods if needed
  sign: jest.fn(),
};

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      Web3Module,
      ConfigurationModule,
      ConfigModule.forRoot({
        isGlobal: true,
      }),
    ],
    providers: [
      SenderEVMBridge, // Include the AuthService provider
      EventLogRepository,
      CommonConfigRepository,
      MultiSignatureRepository,
      {
        provide: ETHBridgeContract,
        useValue: {
          getChainId: () => '0x123',
          unlock: () => ({ success: true, error: null, transactionHash: '0x123...' }), // mock returned result from rpc
        },
      },
      { provide: JwtService, useValue: mockJwtService },
      {
        provide: DataSource,

        useValue: {
          createQueryRunner: jest.fn().mockReturnValue({
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
              save: jest.fn(),
              findOne: jest.fn(),
              update: jest.fn(),
              findOneBy: jest.fn(),
            },
          }),
        },
      },
      {
        provide: CrawlContractRepository,
        useValue: {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        },
      },
      {
        provide: TokenPairRepository,
        useValue: {
          getTokenPair: jest.fn(),
        },
      },
      {
        provide: LoggerService,
        useValue: {
          getLogger: jest.fn().mockReturnValue({
            info: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
          }),
        },
      },
    ],
  }).compile();

  senderEVMBridge = module.get<SenderEVMBridge>(SenderEVMBridge);
  eventLogRepository = module.get<EventLogRepository>(EventLogRepository);
  commonConfigRepository = module.get<CommonConfigRepository>(CommonConfigRepository);
  multiSignatureRepository = module.get<MultiSignatureRepository>(MultiSignatureRepository);
});

describe('handleValidateUnlockTxEVM', () => {
  const commonConfig = {
    id: 1,
    dailyQuota: 500,
    tip: 0.5,
    asset: 'ETH',
  } as CommonConfig;

  const data: Partial<EventLog> = {
    id: 18,
    deletedAt: undefined,
    senderAddress: 'B62qjWwgHupW7k7fcTbb2Kszp4RPYBWYdL4KMmoqfkMH3iRN2FN8u5n',
    amountFrom: '2',
    tokenFromAddress: 'B62qqki2ZnVzaNsGaTDAP6wJYCth5UAcY6tPX2TQYHdwD8D4uBgrDKC',
    networkFrom: ENetworkName.MINA,
    tokenFromName: 'WETH',
    txHashLock: '5JuRCbe4Bu9gbQBbLugbVLateiRNLa8YdJRvfWtvy9iuiNpVXuqr',
    receiveAddress: '0x242CF8b33B29aa18205d07467f69177d2c4295DF',
    amountReceived: '1989900500',
    tokenReceivedAddress: '0x0000000000000000000000000000000000000000',
    networkReceived: ENetworkName.ETH,
    tokenReceivedName: EAsset.ETH,
    txHashUnlock: '0xc1674376040b6cfed204930c5dfd0aae568c3d09e1602bf9fd084fb50bbf40f2',
    blockNumber: 345594,
    blockTimeLock: 1725877528,
    protocolFee: '10099500',
    event: EEventName.LOCK,
    toTokenDecimal: 18,
    status: EEventStatus.WAITING,
    retry: 0,
    validator: [] as MultiSignature[],
    tip: '0.001',
    gasFee: '0.00001',
  };
  it('should handle validator signature generation', async () => {
    const wallet = senderEVMBridge.getWallet();

    data.validator!.push({
      validator: wallet.address,
      txId: 18,
      retry: 2,
      signature:
        '0xc096d8abb2af534fa09b62ca3825a202172239ee0ab3d8438680faca0f0e59153fef0bdc0681162d94cad9fe77b05d4c1945be9c46cb89f9b2821d8576fb28d31b',
    } as MultiSignature);
    jest.spyOn(eventLogRepository, 'findOneBy').mockResolvedValue(data as EventLog);
    jest.spyOn(commonConfigRepository, 'getCommonConfig').mockResolvedValue(commonConfig);
    jest.spyOn(multiSignatureRepository, 'findOneBy').mockResolvedValue(data.validator![0]!);
    jest.spyOn(multiSignatureRepository, 'update').mockResolvedValue(true as any);

    const result = await senderEVMBridge.validateUnlockEVMTransaction(data.id!);
    expect(result.success).toBeTruthy();
  });

  it('should handle Unlock EVM and send to blockchain', async () => {
    jest.spyOn(commonConfigRepository, 'getCommonConfig').mockResolvedValue(commonConfig);
    jest.spyOn(eventLogRepository, 'findOne').mockResolvedValue(data as EventLog);
    jest.spyOn(eventLogRepository, 'updateLockEvenLog').mockResolvedValue(true as any);
    jest.spyOn(eventLogRepository, 'updateStatusAndRetryEvenLog').mockResolvedValue(true as any);

    const result = await senderEVMBridge.handleUnlockEVM(data.id!);
    expect(result.success).toBeTruthy();
  });
});
