import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import dayjs from 'dayjs';
import { Field, ProvablePure, PublicKey, UInt32 } from 'o1js';
import { DataSource, QueryRunner } from 'typeorm';

import { ConfigurationModule } from '../../../config/config.module.js';
import { EEventName, EEventStatus, ENetworkName } from '../../../constants/blockchain.constant.js';
import { EEnvKey } from '../../../constants/env.constant.js';
import { CrawlContractRepository } from '../../../database/repositories/crawl-contract.repository.js';
import { TokenPairRepository } from '../../../database/repositories/token-pair.repository.js';
import { UserRepository } from '../../../database/repositories/user.repository.js';
import { LoggerService } from '../../../shared/modules/logger/logger.service.js';
import { Web3Module } from '../../../shared/modules/web3/web3.module.js';
import { SCBridgeMinaCrawler } from '../crawler.minabridge.js';
import { EventLog } from '../entities/event-logs.entity.js';
import { Bridge } from '../minaSc/Bridge.js';

// Assuming AuthService houses the login function
let minaCrawlerService: SCBridgeMinaCrawler;
let configService: ConfigService;
let dataSource: DataSource;
let queryRunner: QueryRunner;
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
              findOneBy: jest.fn().mockResolvedValue(null),
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
          }),
        },
      },
    ],
  }).compile();

  minaCrawlerService = module.get<SCBridgeMinaCrawler>(SCBridgeMinaCrawler);
  dataSource = module.get<DataSource>(DataSource);
  configService = module.get<ConfigService>(ConfigService);
  queryRunner = dataSource.createQueryRunner();
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
      .mockResolvedValue(PublicKey.fromBase58(configService.get(EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS)));

    jest.spyOn(new Bridge(zaAppAddress), 'fetchEvents').mockResolvedValue(transformedEventArr);
    jest.spyOn(new Bridge(zaAppAddress), 'fetchEvents').mockImplementation(fetchEventsMock);

    await minaCrawlerService.handleEventCrawlBlock();

    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
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
    mockJwtService.sign.mockResolvedValue('true');
    const field = Field.from(transformedLockObject.event.data.receipt.toString());
    const receiveAddress = '0x' + field.toBigInt().toString(16);
    const result = await minaCrawlerService.handlerLockEvent(transformedLockObject, queryRunner);
    jest.spyOn(minaCrawlerService as any, 'handlerLockEvent').mockResolvedValue({
      senderAddress: transformedLockObject.event.data.locker,
      amountFrom: transformedLockObject.event.data.amount.toString(),
      tokenFromAddress: configService.get(EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS),
      networkFrom: ENetworkName.MINA,
      networkReceived: ENetworkName.ETH,
      tokenFromName: 'WETH',
      tokenReceivedAddress: configService.get(EEnvKey.ETH_TOKEN_BRIDGE_ADDRESS),
      txHashLock: transformedLockObject.event.transactionInfo.transactionHash,
      receiveAddress: receiveAddress,
      blockNumber: transformedLockObject.blockHeight.toString(),
      blockTimeLock: Number(Math.floor(dayjs().valueOf() / 1000)),
      event: EEventName.LOCK,
      returnValues: JSON.stringify(transformedLockObject),
      status: EEventStatus.WAITING,
      retry: 0,
      fromTokenDecimal: null,
      toTokenDecimal: null,
    });

    expect(result.success).toBe(true);
  });
});

it('should save the correct event log in handlerUnlockEvent', async () => {
  const transformedUnlockObject = {
    type: 'Unlock',
    event: {
      data: {
        receiver: 'B62qjWwgHupW7k7fcTbb2Kszp4RPYBWYdL4KMmoqfkMH3iRN2FN8u5n',
        tokenAddress: 'B62qqki2ZnVzaNsGaTDAP6wJYCth5UAcY6tPX2TQYHdwD8D4uBgrDKC',
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

  jest.spyOn(queryRunner.manager, 'findOne').mockResolvedValue(mockExistingLockTx);

  const result = await minaCrawlerService.handlerUnLockEvent(transformedUnlockObject, queryRunner);

  expect(queryRunner.manager.findOne).toHaveBeenCalledWith(EventLog, {
    where: { id: transformedUnlockObject.event.data.id.toString() },
  });
  expect(result.success).toBe(true);
});

afterEach(() => {
  jest.clearAllMocks();
});
