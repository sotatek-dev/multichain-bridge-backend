import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';

import { ConfigurationModule } from '@config/config.module';

import { LoggingModule } from '@shared/modules/logger/logger.module';
import { Web3Module } from '@shared/modules/web3/web3.module';

import { SenderMinaBridge } from '../sender.minabridge';
import { MultiSignatureRepository } from 'database/repositories/multi-signature.repository';

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
      tokenReceivedAddress: 'B62qisgt5S7LwrBKEc8wvWNjW7SGTQjMZJTDL2N6FmZSVGrWiNkV21H',
      tokenFromAddress: '0x0000000000000000000000000000000000000000',
      receiveAddress: 'B62qjWwgHupW7k7fcTbb2Kszp4RPYBWYdL4KMmoqfkMH3iRN2FN8u5n',
      amountFrom: '15690000000000000',
        //         15610555
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
      toAddress: 'B62qisgt5S7LwrBKEc8wvWNjW7SGTQjMZJTDL2N6FmZSVGrWiNkV21H',
      fromDecimal: 18,
      toDecimal: 9,
      fromScAddress: '0x83e21AccD43Bb7C23C51e68fFa345fab3983FfeC',
      toScAddress: 'B62qjv5RdC63eidxMofZBtMJdFCnuM9bAoxok1jE7xD2ZXE17WKuT9V',
      status: 'enable',
    });
    const result = await minaCrawlerService.handleUnlockMina();
    expect(result.success).toBe(true);
  });

  // ... other test cases as before (omitted for brevity)
});
