import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { isNumberString } from 'class-validator';

import { EAsset } from '../../constants/api.constant.js';
import { ECoinMarketCapTokenId } from '../../constants/blockchain.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { TokenPriceRepository } from '../../database/repositories/token-price.repository.js';
import { LoggerService } from '../../shared/modules/logger/logger.service.js';
import { TokenPrice } from './entities/index.js';

@Injectable()
export class BatchJobGetPriceToken {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokenPriceRepository: TokenPriceRepository,
    private loggerService: LoggerService,
  ) {}
  private readonly logger = this.loggerService.getLogger('CRAWL_TOKEN_PRICE');

  public async handleGetPriceToken() {
    const apiKey = this.configService.get(EEnvKey.COINMARKET_KEY);
    const apiUrl = this.configService.get(EEnvKey.COINMARKET_URL);
    const headers = {
      'X-CMC_PRO_API_KEY': apiKey,
    };

    const result = await axios.get(apiUrl, { headers });

    const MINA = result.data.data?.[ECoinMarketCapTokenId.MINA];
    const ETH = result.data.data?.[ECoinMarketCapTokenId.ETH];

    let totalUpdated = 0;

    if (MINA) {
      await this.updateTokenPrice(EAsset.MINA, MINA?.quote?.USD.price);
      totalUpdated++;
    } else {
      this.logger.warn('Cannot get MINA token price from CoinMarketCap!');
    }
    if (ETH) {
      await this.updateTokenPrice(EAsset.ETH, ETH?.quote?.USD.price);
      totalUpdated++;
    } else {
      this.logger.warn('Cannot get ETH token price from CoinMarketCap!');
    }
    this.logger.info(`Total token updated = ${totalUpdated}`);
    return;
  }
  private async updateTokenPrice(symbol: EAsset, newPrice: string) {
    if (!isNumberString(newPrice.toString())) {
      this.logger.warn('Invalid new price', newPrice);
      return;
    }
    const toUpdateToken = await this.tokenPriceRepository.getTokenPriceBySymbol(symbol);
    let oldPrice = '0';
    if (!toUpdateToken) {
      await this.tokenPriceRepository.save(new TokenPrice({ symbol, priceUsd: newPrice }));
    } else {
      oldPrice = toUpdateToken.priceUsd;
      toUpdateToken.priceUsd = newPrice;
      await toUpdateToken.save();
    }
    this.logger.info(`Updated price for ${symbol}. Old price: ${oldPrice}, new price: ${newPrice}.`);
  }
}
