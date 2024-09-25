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
  update: jest.fn(),
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
  findBy: jest.fn(),
};
describe('MinaSenderService', () => {
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
    mockMultiSignatureRepository.findBy.mockResolvedValue([
      {
        id: 1,
        validator: 'B62qnqGrRCgzsRTLjvWsaaKuoWmiShmZhJgZ5Km1oef5R4gNh2ZefWw',
        signature: `{"r":"2741909212936774907544021372917077044308732996729673336956874680454178204665","s":"22788518411239874148240096978846169204938272426762803263770936708038651664307"}`,
      },
      {
        id: 2,
        validator: 'B62qq8614KZCuDM7cVScqBLPiLmqLrhVxBt9mRwy95aCZDsbCjfQx8v',
        signature: `{"r":"3438636033281975195816523607371098640098750053457963253301321340385105289889","s":"9711387156003130848729762491878632072833060669134149517867207960037819573927"}`,
      },
      {
        id: 3,
        validator: 'B62qkQ96hyWcc5tyjhN2Qda5X2DfFgVC14ELLAaQTjkpQdveZExK5H9',
        signature: `{"r":"5570236603572533401994258050414813854840150826583453247540834111404926928692","s":"21736293135419403848339637561979298566104722930867359295319005331842934575203"}`,
      },
    ]);
    mockEventLogRepository.getEventLockWithNetwork.mockResolvedValue({
      id: 333,
      tokenReceivedAddress: 'B62qqKNnNRpCtgcBexw5khZSpk9K2d9Z7Wzcyir3WZcVd15Bz8eShVi',
      tokenFromAddress: '0x0000000000000000000000000000000000000000',
      receiveAddress: 'B62qkkjqtrVmRLQhmkCQPw2dwhCZfUsmxCRTSfgdeUPhyTdoMv7h6b9',
      amountFrom: '159719371259000000',
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
      toAddress: 'B62qqKNnNRpCtgcBexw5khZSpk9K2d9Z7Wzcyir3WZcVd15Bz8eShVi',
      fromDecimal: 18,
      toDecimal: 9,
      fromScAddress: '0xa4045da3c53138F84C97668f6deFDf8f4C9348f6',
      toScAddress: 'B62qpeJGDMHp36rqyvfxHmjmHEZk7a7ryq2nCFFHkGHRMqXqkq5F2VS',
      status: 'enable',
    });
    const result = await minaCrawlerService.handleUnlockMina();
    expect(result.success).toBe(true);
  });

  // ... other test cases as before (omitted for brevity)
});
