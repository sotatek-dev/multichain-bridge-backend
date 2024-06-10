import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';

import { ConfigurationModule } from '@config/config.module';

import { Web3Module } from '@shared/modules/web3/web3.module';

import { SenderEVMBridge } from '../sender.evmbridge';

// Mock objects
const mockJwtService = {
  // Mock methods if needed
  sign: jest.fn(),
};

const mockEventLogRepository = {
  getEventLockWithNetwork: jest.fn(),
  updateStatusAndRetryEvenLog: jest.fn(),
  updateLockEvenLog: jest.fn(),
  sumAmountBridgeOfUserInDay: jest.fn(),
};
const mockCommonConfigRepository = {
  getCommonConfig: jest.fn(),
};
const mockTokenPairRepository = {
  getTokenPair: jest.fn(),
};
const mockTokenPriceRepository = {
  getRateETHToMina: jest.fn(),
};
describe('AuthService', () => {
  let evmSenderService: SenderEVMBridge;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [Web3Module, ConfigurationModule],
      providers: [
        SenderEVMBridge,
        { provide: JwtService, useValue: mockJwtService },
        { provide: EventLogRepository, useValue: mockEventLogRepository },
        { provide: CommonConfigRepository, useValue: mockCommonConfigRepository },
        { provide: TokenPairRepository, useValue: mockTokenPairRepository },
        { provide: TokenPriceRepository, useValue: mockTokenPriceRepository },
      ],
    }).compile();

    evmSenderService = module.get<SenderEVMBridge>(SenderEVMBridge);
  });

  it('should handle lock events', async () => {
    mockJwtService.sign.mockResolvedValue('true');
    mockEventLogRepository.getEventLockWithNetwork.mockResolvedValue({
      id: 333,
      tokenReceivedAddress: '0x0000000000000000000000000000000000000000',
      tokenFromAddress: 'B62qqki2ZnVzaNsGaTDAP6wJYCth5UAcY6tPX2TQYHdwD8D4uBgrDKC',
      receiveAddress: '0xb3Edf83eA590F44f5c400077EBd94CCFE10E4Bb0',
      amountFrom: '99499999',
      txHashLock: '0x14ee1dbeff96dc2b2170b209472d83184b7640669f8fb24336994fa83e214c10',
      senderAddress: 'B62qjWwgHupW7k7fcTbb2Kszp4RPYBWYdL4KMmoqfkMH3iRN2FN8u5n',
    });
    mockEventLogRepository.sumAmountBridgeOfUserInDay.mockResolvedValue(0);
    mockCommonConfigRepository.getCommonConfig.mockResolvedValue({
      asset: 'ETH',
      tip: '0.5',
      dailyQuota: '500',
      id: 1,
    });
    mockTokenPairRepository.getTokenPair.mockResolvedValue({
      id: 5,
      deletedAt: null,
      fromChain: 'mina',
      toChain: 'eth',
      fromSymbol: 'WETH',
      toSymbol: 'ETH',
      fromAddress: 'B62qqki2ZnVzaNsGaTDAP6wJYCth5UAcY6tPX2TQYHdwD8D4uBgrDKC',
      toAddress: '0x0000000000000000000000000000000000000000',
      fromDecimal: 9,
      toDecimal: 18,
      fromScAddress: 'B62qoArtCz52mtxKxtGR3sPdS9yq6DucRW53nAerndwg9oEhUvJvpRy',
      toScAddress: '0x83e21AccD43Bb7C23C51e68fFa345fab3983FfeC',
      status: 'enable',
    });
    const result = await evmSenderService.handleUnlockEVM();
    expect(result.success).toBe(true);
  });
});
