import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { EventData } from 'web3-eth-contract';

import { initializeEthContract } from '../../../config/common.config.js';
import { ConfigurationModule } from '../../../config/config.module.js';
import { EEventName, EEventStatus, ENetworkName } from '../../../constants/blockchain.constant.js';
import { EEnvKey } from '../../../constants/env.constant.js';
import { CrawlContractRepository } from '../../../database/repositories/crawl-contract.repository.js';
import { TokenPairRepository } from '../../../database/repositories/token-pair.repository.js';
import { TokenPair } from '../../../modules/users/entities/tokenpair.entity.js';
import { LoggerService } from '../../../shared/modules/logger/logger.service.js';
import { DefaultContract, ETHBridgeContract } from '../../../shared/modules/web3/web3.service.js';
import { BlockchainEVMCrawler } from '../crawler.evmbridge.js';
import { CrawlContract, EventLog } from '../entities/index.js';

describe('BlockchainEVMCraler', () => {
  let crawler: BlockchainEVMCrawler;
  let dataSource: DataSource;
  let newEthBridgeContract: ETHBridgeContract;
  let queryRunner: QueryRunner;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        ConfigurationModule,
      ],
      providers: [
        BlockchainEVMCrawler,
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
            }),
          },
        },
        {
          provide: ETHBridgeContract,
          useValue: {
            getEvent: jest.fn(),
            getBlockTimeByBlockNumber: jest.fn(),
            getStartBlock: jest.fn(),
            getBlockNumber: jest.fn(),
            getContractAddress: jest.fn(),
          },
        },
        {
          provide: DefaultContract,
          useValue: {
            getEvent: jest.fn(),
            wrapper: jest.fn(),
            initContract: jest.fn(),
          },
        },
      ],
    }).compile();

    crawler = module.get<BlockchainEVMCrawler>(BlockchainEVMCrawler);
    dataSource = module.get<DataSource>(DataSource);
    newEthBridgeContract = module.get<ETHBridgeContract>(ETHBridgeContract);
    configService = module.get<ConfigService>(ConfigService);
    queryRunner = dataSource.createQueryRunner();
  });

  describe('handleEventCrawlBlock', () => {
    it('should successfully handle events and commit transaction', async () => {
      // Mocking getFromToBlock to return start and end block numbers
      jest.spyOn(crawler as any, 'getFromToBlock').mockResolvedValue({ startBlockNumber: 5434541, toBlock: 5434552 });
      const ethBridgeContract = await initializeEthContract(configService);
      const getEvent = await ethBridgeContract.getEvent(
        await (
          await crawler['getFromToBlock']()
        ).startBlockNumber,
        await (
          await crawler['getFromToBlock']()
        ).toBlock,
      );

      expect(getEvent).toBeDefined();

      const receivedObject = {
        address: '0x83e21AccD43Bb7C23C51e68fFa345fab3983FfeC',
        blockHash: '0xbb4323b3443ee6ba9dc12597e5df383b3f497fa7b875e438c33fecdb4efe6278',
        blockNumber: 5434542,
        event: 'Lock',
        logIndex: 16,
        raw: {
          data: '0x000000000000000000000000c31cbd88f0b0fbf9686200a6a3c41b23e8901be700000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000374236327171505a576a7252377453676e395470766a455955484e675a6f5a78784d315a764c367053414863634142517a7877694b78544700000000000000000000000000000000000000000000000000000000000000000000000000000000034554480000000000000000000000000000000000000000000000000000000000',
          topics: ['0xdb2afed7fa09277d868c7d909e59f48f8fe738cf8b88268672f81075db44e0a3'],
        },
        returnValues: {
          '0': '0xC31cBD88f0b0fBF9686200a6A3c41b23E8901bE7',
          '1': 'B62qqPZWjrR7tSgn9TpvjEYUHNgZoZxxM1ZvL6pSAHccABQzxwiKxTG',
          '2': '0x0000000000000000000000000000000000000000',
          '3': '100000000000000000',
          '4': 'ETH',
          amount: '100000000000000000',
          locker: '0xC31cBD88f0b0fBF9686200a6A3c41b23E8901bE7',
          receipt: 'B62qqPZWjrR7tSgn9TpvjEYUHNgZoZxxM1ZvL6pSAHccABQzxwiKxTG',
          token: '0x0000000000000000000000000000000000000000',
          tokenName: 'ETH',
        },
        signature: '0xdb2afed7fa09277d868c7d909e59f48f8fe738cf8b88268672f81075db44e0a3',
        transactionHash: '0x662e9ae1929f82153e99522a755d4db0c36544cbaab390a6cc7d546b1b4b4095',
        transactionIndex: 33,
      };

      jest.spyOn(crawler as any, 'handlerLockEvent').mockResolvedValue(receivedObject);
      (newEthBridgeContract.getEvent as jest.Mock).mockResolvedValue(getEvent);
      await crawler.handleEventCrawlBlock();

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should save the correct event log in handlerLockEvent', async () => {
      const ethBridgeContract = await initializeEthContract(configService);
      const lockReturnObject = {
        address: '0x83e21AccD43Bb7C23C51e68fFa345fab3983FfeC',
        blockHash: '0xbb4323b3443ee6ba9dc12597e5df383b3f497fa7b875e438c33fecdb4efe6278',
        blockNumber: 5434542,
        event: 'Lock',
        logIndex: 16,
        raw: {
          data: '0x000000000000000000000000c31cbd88f0b0fbf9686200a6a3c41b23e8901be700000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000374236327171505a576a7252377453676e395470766a455955484e675a6f5a78784d315a764c367053414863634142517a7877694b78544700000000000000000000000000000000000000000000000000000000000000000000000000000000034554480000000000000000000000000000000000000000000000000000000000',
          topics: ['0xdb2afed7fa09277d868c7d909e59f48f8fe738cf8b88268672f81075db44e0a3'],
        },
        returnValues: {
          '0': '0xC31cBD88f0b0fBF9686200a6A3c41b23E8901bE7',
          '1': 'B62qqPZWjrR7tSgn9TpvjEYUHNgZoZxxM1ZvL6pSAHccABQzxwiKxTG',
          '2': '0x0000000000000000000000000000000000000000',
          '3': '100000000000000000',
          '4': 'ETH',
          amount: '100000000000000000',
          locker: '0xC31cBD88f0b0fBF9686200a6A3c41b23E8901bE7',
          receipt: 'B62qqPZWjrR7tSgn9TpvjEYUHNgZoZxxM1ZvL6pSAHccABQzxwiKxTG',
          token: '0x0000000000000000000000000000000000000000',
          tokenName: 'ETH',
        },
        signature: '0xdb2afed7fa09277d868c7d909e59f48f8fe738cf8b88268672f81075db44e0a3',
        transactionHash: '0x662e9ae1929f82153e99522a755d4db0c36544cbaab390a6cc7d546b1b4b4095',
        transactionIndex: 33,
      } as EventData;

      const mockTokenPair = {
        fromAddress: '0xFromAddress',
        toAddress: '0xToAddress',
        fromDecimal: 18,
        toDecimal: 18,
      } as TokenPair;
      const mockBlockTime = await ethBridgeContract.getBlockTimeByBlockNumber(lockReturnObject.blockNumber);
      (newEthBridgeContract.getBlockTimeByBlockNumber as jest.Mock).mockResolvedValue(mockBlockTime);
      const result = await crawler.handlerLockEvent(lockReturnObject, queryRunner);
      jest.spyOn(crawler as any, 'handlerLockEvent').mockResolvedValue({
        blockNumber: lockReturnObject.blockNumber,
        senderAddress: lockReturnObject.returnValues.locker,
        amountFrom: lockReturnObject.returnValues.amount,
        tokenFromAddress: lockReturnObject.returnValues.token,
        networkFrom: ENetworkName.ETH,
        networkReceived: ENetworkName.MINA,
        tokenFromName: lockReturnObject.returnValues.tokenName,
        tokenReceivedAddress: '0xMinaTokenBridgeAddress',
        txHashLock: lockReturnObject.transactionHash,
        receiveAddress: lockReturnObject.returnValues.receipt,
        event: EEventName.LOCK,
        returnValues: JSON.stringify(lockReturnObject.returnValues),
        status: EEventStatus.WAITING,
        retry: 0,
        fromTokenDecimal: mockTokenPair.fromDecimal,
        toTokenDecimal: mockTokenPair.toDecimal,
        blockTimeLock: mockBlockTime.timestamp,
      });

      expect(result.success).toBe(true);
    });

    it('should save the correct event log in handlerUnlockEvent', async () => {
      const unlockObject = {
        address: '0x83e21AccD43Bb7C23C51e68fFa345fab3983FfeC',
        blockNumber: 6591652,
        transactionHash: '0x8d863f9701b6bf9684f57ff9a1949f54725673349c7b1f2c0a67f87dc9bf7d41',
        transactionIndex: 70,
        blockHash: '0xb901e9c50cea83fcb94287bc63aa4189ba78c56cbcb2951c8617fbb6de42819e',
        logIndex: 148,
        removed: false,
        id: 'log_8bf6b52d',
        returnValues: {
          '0': '0xDc450585987fEcC247B0de5ea03522000361e16c',
          '1': '0x0000000000000000000000000000000000000000',
          '2': '994999999999999',
          '3': '5JtqwqhHqA9pifP9eJJ6rVsVp8DLnTDKjPBeMHRWuZ2kvG9fckef',
          '4': '5000000000001',
          user: '0xDc450585987fEcC247B0de5ea03522000361e16c',
          token: '0x0000000000000000000000000000000000000000',
          amount: '994999999999999',
          hash: '5JtqwqhHqA9pifP9eJJ6rVsVp8DLnTDKjPBeMHRWuZ2kvG9fckef',
          fee: '5000000000001',
        },
        event: 'Unlock',
        signature: '0x7fbd879c56999418e89f051bc4891f2af0bac78cf32eb10b1cf3640ae214358f',
        raw: {
          data: '0x000000000000000000000000dc450585987fecc247b0de5ea03522000361e16c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000388f27d8d2fff00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000048c273950010000000000000000000000000000000000000000000000000000000000000034354a7471777168487141397069665039654a4a36725673567038444c6e54444b6a5042654d485257755a326b76473966636b6566000000000000000000000000',
          topics: ['0x7fbd879c56999418e89f051bc4891f2af0bac78cf32eb10b1cf3640ae214358f'],
        },
      } as EventData;

      const mockExistingLockTx = {
        id: 1,
        txHashLock: '0x12345',
        status: EEventStatus.WAITING,
      };

      jest.spyOn(queryRunner.manager, 'findOne').mockResolvedValue(mockExistingLockTx);

      const result = await crawler.handlerUnLockEvent(unlockObject, queryRunner);

      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(EventLog, {
        where: { txHashLock: unlockObject.returnValues.hash },
      });

      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        EventLog,
        mockExistingLockTx.id,
        expect.objectContaining({
          status: EEventStatus.COMPLETED,
          txHashUnlock: unlockObject.transactionHash,
          amountReceived: unlockObject.returnValues.amount,
          tokenReceivedAddress: unlockObject.returnValues.token,
          protocolFee: unlockObject.returnValues.fee,
          tokenReceivedName: 'ETH',
        }),
      );

      expect(result.success).toBe(true);
    });

    it('should call queryRunner.manager.update with correct parameters', async () => {
      const mockBlockNumber = await (await crawler['getFromToBlock']()).toBlock;
      const mockContractAddress = configService.get<string>(EEnvKey.ETH_BRIDGE_CONTRACT_ADDRESS);
      const mockNetworkName = ENetworkName.ETH;

      await crawler.updateLatestBlockCrawl(mockBlockNumber, queryRunner);

      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        CrawlContract,
        {
          contractAddress: mockContractAddress,
          networkName: mockNetworkName,
        },
        {
          latestBlock: mockBlockNumber,
        },
      );
    });
    it('should rollback transaction on error', async () => {
      // Mocking getFromToBlock to return start and end block numbers
      jest.spyOn(crawler as any, 'getFromToBlock').mockResolvedValue({ startBlockNumber: 1, toBlock: 100 });

      // Mocking ethBridgeContract.getEvent to throw an error
      newEthBridgeContract.getEvent = jest.fn().mockRejectedValue(new Error('Event fetch error'));

      await expect(crawler.handleEventCrawlBlock()).rejects.toThrow('Event fetch error');

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});
