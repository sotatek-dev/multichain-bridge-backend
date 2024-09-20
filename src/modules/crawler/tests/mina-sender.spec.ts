import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { ConfigurationModule } from '../../../config/config.module.js';
import { CommonConfigRepository } from '../../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../../database/repositories/event-log.repository.js';
import { MultiSignatureRepository } from '../../../database/repositories/multi-signature.repository.js';
import { TokenPairRepository } from '../../../database/repositories/token-pair.repository.js';
import { TokenPriceRepository } from '../../../database/repositories/token-price.repository.js';
import { LoggingModule } from '../../../shared/modules/logger/logger.module.js';
import { Web3Module } from '../../../shared/modules/web3/web3.module.js';
import { SenderMinaBridge } from '../sender.minabridge.js';

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
const mockMultiSignatureRepository = {
  getRateETHToMina: jest.fn(),
};
describe('AuthService', () => {
  let minaCrawlerService: SenderMinaBridge;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [Web3Module, ConfigurationModule, LoggingModule],
      providers: [
        SenderMinaBridge,
        { provide: JwtService, useValue: mockJwtService },
        { provide: EventLogRepository, useValue: mockEventLogRepository },
        { provide: CommonConfigRepository, useValue: mockCommonConfigRepository },
        { provide: TokenPairRepository, useValue: mockTokenPairRepository },
        { provide: TokenPriceRepository, useValue: mockTokenPriceRepository },
        { provide: MultiSignatureRepository, useValue: mockMultiSignatureRepository },
      ],
    }).compile();

    minaCrawlerService = module.get<SenderMinaBridge>(SenderMinaBridge);
  });

  it('should handle lock events', async () => {
    mockJwtService.sign.mockResolvedValue('true');
    mockEventLogRepository.getEventLockWithNetwork.mockResolvedValue({
      id: 333,
      tokenReceivedAddress: 'B62qkuPGhLfrD12buqho48hSnc3DMGQ1d4ugzNjtYuRmSi5vvAjoZRz',
      tokenFromAddress: '0x0000000000000000000000000000000000000000',
      receiveAddress: 'B62qjWwgHupW7k7fcTbb2Kszp4RPYBWYdL4KMmoqfkMH3iRN2FN8u5n',
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
      toAddress: 'B62qkuPGhLfrD12buqho48hSnc3DMGQ1d4ugzNjtYuRmSi5vvAjoZRz',
      fromDecimal: 18,
      toDecimal: 9,
      fromScAddress: '0x83e21AccD43Bb7C23C51e68fFa345fab3983FfeC',
      toScAddress: 'B62qqKFZav5StzHmRkaU21Mw34CgGu5fWCsdGcCuxdgjZb3MSrxo67Q',
      status: 'enable',
    });
    const result = await minaCrawlerService.handleUnlockMina();
    expect(result.success).toBe(true);
  });

  // ... other test cases as before (omitted for brevity)
});
