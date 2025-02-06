import { PublicKey, UInt32 } from 'o1js';

import { EEventStatus } from '../../../constants/blockchain.constant.js';
import { getMockedRepo, initModuleTest } from '../../../shared/__test__/base/test.lib.js';
import { SCBridgeMinaCrawler } from '../crawler.minabridge.js';
import { CommonConfig } from '../entities/common-config.entity.js';
import { EventLog } from '../entities/event-logs.entity.js';

let minaCrawlerService: SCBridgeMinaCrawler;

beforeEach(async () => {
  const { unit } = await initModuleTest(SCBridgeMinaCrawler);
  minaCrawlerService = unit;
});
describe('handleMinaChainCrawler', () => {
  it('should save locked tx from MINA to be unlocked later in ETH', async () => {
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
    // config help calculate amount received, fee
    configRepo.findOneBy.mockResolvedValue({
      id: 1,
      tip: 5,
      feeUnlockEth: '0.0001',
      feeUnlockMina: '0.00001',
    } as CommonConfig);
    eventLogRepo.save.mockResolvedValue(new EventLog({ id: 1, status: EEventStatus.WAITING }));
    const result = await minaCrawlerService.handlerLockEvent(transformedLockObject, eventLogRepo, configRepo);
    expect(result?.success).toBe(true);
  });
});

it('should update pending unlock tx', async () => {
  // mocked events from Mina
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

  // tx to be updated the status.
  const mockExistingLockTx = {
    id: 1,
    txHashLock: '0x12345',
    status: EEventStatus.WAITING,
  };
  const eventLogRepo = getMockedRepo<EventLog>();
  const configRepo = getMockedRepo<CommonConfig>();
  eventLogRepo.findOneBy.mockResolvedValue(mockExistingLockTx as EventLog);
  configRepo.findOneBy.mockResolvedValue({
    id: 1,
    asset: 'ETH',
    totalWethBurnt: '123',
    totalWethMinted: '123',
  } as CommonConfig);
  // expect mockExistingLockTx status updated to COMPLETED.
  const result = await minaCrawlerService.handlerUnLockEvent(transformedUnlockObject, eventLogRepo, configRepo);
  expect(result!.success).toBe(true);
});

afterEach(() => {
  jest.clearAllMocks();
});
