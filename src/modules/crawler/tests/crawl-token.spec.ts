import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ConfigurationModule } from '../../../config/config.module.js';
import { EAsset } from '../../../constants/api.constant.js';
import { TokenPriceRepository } from '../../../database/repositories/token-price.repository.js';
import { LoggerService } from '../../../shared/modules/logger/logger.service.js';
import { BatchJobGetPriceToken } from '../batch.tokenprice.js';

describe('BlockchainEVMCraler', () => {
  let tokenCrawlService: BatchJobGetPriceToken;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        ConfigurationModule,
      ],
      providers: [
        BatchJobGetPriceToken,
        {
          provide: TokenPriceRepository,
          useValue: {
            getTokenPriceBySymbol: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            getLogger: jest.fn().mockReturnValue({
              info: jest.fn(),
              warn: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    tokenCrawlService = module.get<BatchJobGetPriceToken>(BatchJobGetPriceToken);
  });

  describe('handle crawl token price', () => {
    it('should update the token price', async () => {
      const result0 = await tokenCrawlService.handleGetPriceToken();
      const result1 = await tokenCrawlService.updateTokenPrice(EAsset.ETH, '1.1111111');

      expect(result1).toBeTruthy();
      expect(result0).toBeTruthy();
    });
    it('should fail to update the token price', async () => {
      const result1 = await tokenCrawlService.updateTokenPrice(EAsset.ETH, null);
      const result2 = await tokenCrawlService.updateTokenPrice(EAsset.ETH, undefined);
      const result3 = await tokenCrawlService.updateTokenPrice(EAsset.ETH, '');
      const result4 = await tokenCrawlService.updateTokenPrice(EAsset.ETH, '1,2');

      expect(result1).toBeFalsy();
      expect(result2).toBeFalsy();
      expect(result3).toBeFalsy();
      expect(result4).toBeFalsy();
    });
  });
});