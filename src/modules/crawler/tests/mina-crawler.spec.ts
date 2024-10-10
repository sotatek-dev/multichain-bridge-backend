import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ProvablePure, PublicKey, UInt32 } from 'o1js';
import { DataSource } from 'typeorm';

import { ConfigurationModule } from '../../../config/config.module.js';
import { EEventStatus } from '../../../constants/blockchain.constant.js';
import { EEnvKey } from '../../../constants/env.constant.js';
import { CrawlContractRepository } from '../../../database/repositories/crawl-contract.repository.js';
import { UserRepository } from '../../../database/repositories/user.repository.js';
import { LoggerService } from '../../../shared/modules/logger/logger.service.js';
import { Web3Module } from '../../../shared/modules/web3/web3.module.js';
import { SCBridgeMinaCrawler } from '../crawler.minabridge.js';
import { CommonConfig } from '../entities/common-config.entity.js';
import { EventLog } from '../entities/event-logs.entity.js';
import { Bridge } from '../minaSc/Bridge.js';
import { getMockedRepo } from './base/test-utils.js';

// Assuming AuthService houses the login function
let minaCrawlerService: SCBridgeMinaCrawler;
let configService: ConfigService;

// Mock objects
const mockJwtService = {
  // Mock methods if needed
  sign: jest.fn(),
};

const mockUserRepository = {
  findOneBy: jest.fn(),
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
      SCBridgeMinaCrawler, // Include the AuthService provider
      { provide: JwtService, useValue: mockJwtService },
      { provide: UserRepository, useValue: mockUserRepository },
      {
        provide: CrawlContractRepository,
        useValue: {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        },
      },
      {
        provide: DataSource,
        useValue: {
          transaction: jest.fn(),
        },
      },
      {
        provide: LoggerService,
        useValue: {
          getLogger: jest.fn().mockReturnValue({
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          }),
        },
      },
    ],
  }).compile();

  minaCrawlerService = module.get<SCBridgeMinaCrawler>(SCBridgeMinaCrawler);
  configService = module.get<ConfigService>(ConfigService);
});
describe('handleMinaChainCrawler', () => {
  const transformedUnlockObject = {
    type: 'Unlock',
    event: {
      data: {} as ProvablePure<any>,
      transactionInfo: {
        transactionHash: '5Jv2SKAfsLRGaxf2mTBe4tk8SANZQ4RjgBHrvFXAxT9kUagmmEET',
        transactionStatus: 'applied',
        transactionMemo: 'E4YM2vTHhWEg66xpj52JErHUBU4pZ1yageL4TVDDpTTSsv8mK6YaH',
      },
    },
    blockHeight: UInt32.from(344242),
    blockHash: '3NLTWrxnTKf37tSoFwK9riA8VatkPWy8GDxfj9tBS9boxbzsKcvK',
    parentBlockHash: '3NLwxgzCnLyYXSKiprqjoousFkks3UjKMD3A6YKwbrX9BMQbhJCV',
    globalSlot: UInt32.from(517024),
    chainStatus: 'pending',
  };
  const transformedLockObject = {
    type: 'Lock',
    event: {
      data: {} as ProvablePure<any>,
      transactionInfo: {
        transactionHash: '5JtqwqhHqA9pifP9eJJ6rVsVp8DLnTDKjPBeMHRWuZ2kvG9fckef',
        transactionStatus: 'applied',
        transactionMemo: 'E4YM2vTHhWEg66xpj52JErHUBU4pZ1yageL4TVDDpTTSsv8mK6YaH',
      },
    },
    blockHeight: UInt32.from(341988),
    blockHash: '3NKM2aH6CoWSdnJKLSh6v7DsL2vcrTxkjJP821rpBNSBJBkxWL7u',
    parentBlockHash: '3NLHBiwALvsBCdvHkGx7tHgTsJWxCK2cexQma8hh4SGcpK8GFy7g',
    globalSlot: UInt32.from(513687),
    chainStatus: 'canonical',
  };

  const transformedEventArr = [transformedUnlockObject, transformedLockObject];

  it('should successfully handle events and commit transaction', async () => {
    jest
      .spyOn(minaCrawlerService as any, 'getFromToBlock')
      .mockResolvedValue({ startBlockNumber: UInt32.from(123), toBlock: UInt32.from(124) });

    const fetchEventsMock = jest.fn().mockResolvedValue([transformedUnlockObject, transformedLockObject]);
    const zaAppAddress = jest
      .fn()
      .mockResolvedValue(PublicKey.fromBase58(configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS)!));

    jest.spyOn(new Bridge(zaAppAddress), 'fetchEvents').mockResolvedValue(transformedEventArr);
    jest.spyOn(new Bridge(zaAppAddress), 'fetchEvents').mockImplementation(fetchEventsMock);

    await minaCrawlerService.handleEventCrawlBlock();
  });

  it('should save the correct event log in handlerLockEvent', async () => {
    const transformedLockObject = {
      type: 'Lock',
      event: {
        data: {
          locker: 'B62qjWwgHupW7k7fcTbb2Kszp4RPYBWYdL4KMmoqfkMH3iRN2FN8u5n',
          receipt: '1257517202021634646715564873528857334151894917484',
          amount: '1000000',
          tokenAddress: 'B62qqki2ZnVzaNsGaTDAP6wJYCth5UAcY6tPX2TQYHdwD8D4uBgrDKC',
        },
        transactionInfo: {
          transactionHash: '5JtqwqhHqA9pifP9eJJ6rVsVp8DLnTDKjPBeMHRWuZ2kvG9fckef',
          transactionStatus: 'applied',
          transactionMemo: 'E4YM2vTHhWEg66xpj52JErHUBU4pZ1yageL4TVDDpTTSsv8mK6YaH',
        },
      },
      blockHeight: UInt32.from(341988),
      blockHash: '3NKM2aH6CoWSdnJKLSh6v7DsL2vcrTxkjJP821rpBNSBJBkxWL7u',
      parentBlockHash: '3NLHBiwALvsBCdvHkGx7tHgTsJWxCK2cexQma8hh4SGcpK8GFy7g',
      globalSlot: UInt32.from(513687),
      chainStatus: 'canonical',
    };
    const eventLogRepo = getMockedRepo<EventLog>();
    const configRepo = getMockedRepo<CommonConfig>();
    jest.spyOn(configRepo, 'findOneBy').mockResolvedValue({
      id: 1,
      tip: 5,
    } as any);
    const result = await minaCrawlerService.handlerLockEvent(transformedLockObject, eventLogRepo, configRepo);
    expect(result?.success).toBe(true);
  });
});

it('should save the correct event log in handlerUnlockEvent', async () => {
  const transformedUnlockObject = {
    type: 'Unlock',
    event: {
      data: {
        receiver: 'B62qjWwgHupW7k7fcTbb2Kszp4RPYBWYdL4KMmoqfkMH3iRN2FN8u5n',
        tokenAddress: PublicKey.fromBase58('B62qqki2ZnVzaNsGaTDAP6wJYCth5UAcY6tPX2TQYHdwD8D4uBgrDKC'),
        amount: '15610555',
        id: '333',
      },
      transactionInfo: {
        transactionHash: '5Jv2SKAfsLRGaxf2mTBe4tk8SANZQ4RjgBHrvFXAxT9kUagmmEET',
        transactionStatus: 'applied',
        transactionMemo: 'E4YM2vTHhWEg66xpj52JErHUBU4pZ1yageL4TVDDpTTSsv8mK6YaH',
      },
    },
    blockHeight: UInt32.from(344242),
    blockHash: '3NLTWrxnTKf37tSoFwK9riA8VatkPWy8GDxfj9tBS9boxbzsKcvK',
    parentBlockHash: '3NLwxgzCnLyYXSKiprqjoousFkks3UjKMD3A6YKwbrX9BMQbhJCV',
    globalSlot: UInt32.from(517024),
    chainStatus: 'pending',
  };

  const mockExistingLockTx = {
    id: 1,
    txHashLock: '0x12345',
    status: EEventStatus.WAITING,
  };
  const eventLogRepo = getMockedRepo<EventLog>();

  jest.spyOn(eventLogRepo, 'findOneBy').mockResolvedValue(mockExistingLockTx as EventLog);

  const result = await minaCrawlerService.handlerUnLockEvent(transformedUnlockObject, eventLogRepo);

  expect(result!.success).toBe(true);
});

afterEach(() => {
  jest.clearAllMocks();
});
