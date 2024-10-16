import { EventData } from 'web3-eth-contract';

import { EEventStatus } from '../../../constants/blockchain.constant.js';
import { getMockedRepo, initModuleTest } from '../../../shared/__test__/base/test.lib.js';
import { ETHBridgeContract } from '../../../shared/modules/web3/web3.service.js';
import { BlockchainEVMCrawler } from '../crawler.evmbridge.js';
import { CommonConfig } from '../entities/common-config.entity.js';
import { EventLog } from '../entities/index.js';

describe('BlockchainEVMCraler', () => {
  let crawler: BlockchainEVMCrawler;
  let newEthBridgeContract: jest.Mocked<ETHBridgeContract>;

  beforeEach(async () => {
    const { unit, unitRef } = await initModuleTest(BlockchainEVMCrawler);

    crawler = unit;
    newEthBridgeContract = unitRef.get<ETHBridgeContract>(ETHBridgeContract);
  });

  describe('handleEventCrawlBlock', () => {
    it('should save the correct event log in handlerLockEvent', async () => {
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

      const configRepo = getMockedRepo<CommonConfig>();

      const eventLogRepo = getMockedRepo<EventLog>();
      jest
        .spyOn(configRepo, 'findOneBy')
        .mockResolvedValue({ id: 1, tip: 5, feeUnlockEth: '0.0001', feeUnlockMina: '0.00001' } as CommonConfig);

      newEthBridgeContract.getBlockTimeByBlockNumber.mockResolvedValueOnce({ timestamp: 123456 });
      const result = await crawler.handlerLockEvent(lockReturnObject, eventLogRepo, configRepo);
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

      const eventLogRepo = getMockedRepo<EventLog>();
      jest.spyOn(eventLogRepo, 'findOneBy').mockResolvedValue(mockExistingLockTx as EventLog);
      const result = await crawler.handlerUnLockEvent(unlockObject, eventLogRepo);

      expect(eventLogRepo.update).toHaveBeenCalledWith(
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

    it('should rollback transaction on error', async () => {
      // Mocking getFromToBlock to return start and end block numbers
      jest.spyOn(crawler as any, 'getFromToBlock').mockResolvedValue({ startBlockNumber: 1, toBlock: 100 });

      // Mocking ethBridgeContract.getEvent to throw an error
      newEthBridgeContract.getEvent = jest.fn().mockRejectedValue(new Error('Event fetch error'));

      await expect(crawler.handleEventCrawlBlock(0)).rejects.toThrow('Event fetch error');
    });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});
