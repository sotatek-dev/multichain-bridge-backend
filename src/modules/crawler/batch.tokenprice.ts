import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { isEmpty, isNumberString } from 'class-validator';

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

    const minaNewPrice = result.data.data?.[ECoinMarketCapTokenId.MINA]?.quote?.USD.price;
    const ethNewPrice = result.data.data?.[ECoinMarketCapTokenId.ETH]?.quote?.USD.price;

    const res = await Promise.all([
      this.updateTokenPrice(EAsset.MINA, minaNewPrice),
      this.updateTokenPrice(EAsset.ETH, ethNewPrice),
    ]);

    this.logger.info(`Total tokens updated = ${res.filter(e => !!e).length}`);
  }
  private async updateTokenPrice(symbol: EAsset, newPrice: string): Promise<boolean> {
    if (isEmpty(newPrice) && !isNumberString(newPrice.toString())) {
      this.logger.warn(`Cannot get ${symbol} token price from CoinMarketCap! value ${newPrice}.`);
      return false;
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
    return true;
  }
}
