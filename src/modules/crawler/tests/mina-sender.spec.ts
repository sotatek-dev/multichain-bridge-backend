import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';

import { ConfigurationModule } from '@config/config.module';

import { Web3Module } from '@shared/modules/web3/web3.module';

import { SenderMinaBridge } from '../sender.minabridge';

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
  let minaCrawlerService: SenderMinaBridge;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [Web3Module, ConfigurationModule],
      providers: [
        SenderMinaBridge,
        { provide: JwtService, useValue: mockJwtService },
        { provide: EventLogRepository, useValue: mockEventLogRepository },
        { provide: CommonConfigRepository, useValue: mockCommonConfigRepository },
        { provide: TokenPairRepository, useValue: mockTokenPairRepository },
        { provide: TokenPriceRepository, useValue: mockTokenPriceRepository },
      ],
    }).compile();

    minaCrawlerService = module.get<SenderMinaBridge>(SenderMinaBridge);
  });

  it('should handle lock events', async () => {
    mockJwtService.sign.mockResolvedValue('true');
    mockEventLogRepository.getEventLockWithNetwork.mockResolvedValue({
      id: 333,
      tokenReceivedAddress: 'B62qqki2ZnVzaNsGaTDAP6wJYCth5UAcY6tPX2TQYHdwD8D4uBgrDKC',
      tokenFromAddress: '0x0000000000000000000000000000000000000000',
      receiveAddress: 'B62qqki2ZnVzaNsGaTDAP6wJYCth5UAcY6tPX2TQYHdwD8D4uBgrDKC',
      amountFrom: '15690000000000000',
      senderAddress: '0xb3Edf83eA590F44f5c400077EBd94CCFE10E4Bb0',
    });
    mockEventLogRepository.sumAmountBridgeOfUserInDay.mockResolvedValue(0);
    mockCommonConfigRepository.getCommonConfig.mockResolvedValue({
      asset: 'ETH',
      tip: '0.5',
      dailyQuota: '500',
      id: 1,
    });
    mockTokenPriceRepository.getRateETHToMina.mockResolvedValue({ rateethmina: 3870.44 });
    mockTokenPairRepository.getTokenPair.mockResolvedValue({
      id: 5,
      deletedAt: null,
      fromChain: 'eth',
      toChain: 'mina',
      fromSymbol: 'ETH',
      toSymbol: 'WETH',
      fromAddress: '0x0000000000000000000000000000000000000000',
      toAddress: 'B62qqki2ZnVzaNsGaTDAP6wJYCth5UAcY6tPX2TQYHdwD8D4uBgrDKC',
      fromDecimal: 18,
      toDecimal: 9,
      fromScAddress: '0x83e21AccD43Bb7C23C51e68fFa345fab3983FfeC',
      toScAddress: 'B62qoArtCz52mtxKxtGR3sPdS9yq6DucRW53nAerndwg9oEhUvJvpRy',
      status: 'enable',
    });
    const result = await minaCrawlerService.handleUnlockMina();
    expect(result.success).toBe(true);
  });

  // ... other test cases as before (omitted for brevity)
});
