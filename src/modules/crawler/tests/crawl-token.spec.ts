import { EAsset } from '../../../constants/api.constant.js';
import { initModuleTest } from '../../../shared/__test__/base/test.lib.js';
import { BatchJobGetPriceToken } from '../batch.tokenprice.js';

describe('BlockchainEVMCraler', () => {
  let tokenCrawlService: BatchJobGetPriceToken;

  beforeEach(async () => {
    const { unit } = await initModuleTest(BatchJobGetPriceToken);

    tokenCrawlService = unit;
  });
  // crawl price of MINA and ETH from coinmarketcaps
  describe('handle crawl token price', () => {
    test('should update the token price', async () => {
      const result0 = await tokenCrawlService.handleGetPriceToken();
      const result1 = await tokenCrawlService.updateTokenPrice(EAsset.ETH, '1.1111111');

      expect(result1).toBeTruthy();
      expect(result0).toBeTruthy();
    });
    test('should fail to update the token price', async () => {
      const result1 = await tokenCrawlService.updateTokenPrice(EAsset.ETH, null as any);
      const result2 = await tokenCrawlService.updateTokenPrice(EAsset.ETH, undefined as any);
      const result3 = await tokenCrawlService.updateTokenPrice(EAsset.ETH, '');
      const result4 = await tokenCrawlService.updateTokenPrice(EAsset.ETH, '1,2');
      // this test will raise many error logs in the console.
      expect(result1).toBeFalsy();
      expect(result2).toBeFalsy();
      expect(result3).toBeFalsy();
      expect(result4).toBeFalsy();
    });
  });
});
