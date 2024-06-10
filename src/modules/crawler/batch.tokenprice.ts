import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenPriceRepository } from 'database/repositories/token-price.repository';

import { EEnvKey } from '@constants/env.constant';

import { TokenPrice } from './entities';

@Injectable()
export class BatchJobGetPriceToken {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokenPriceRepository: TokenPriceRepository,
  ) {}
  public async handleGetPriceToken() {
    try {
      const apiKey = this.configService.get(EEnvKey.COINMARKET_KEY);
      const apiUrl = this.configService.get(EEnvKey.COINMARKET_URL);
      const headers = {
        'X-CMC_PRO_API_KEY': apiKey,
      };

      const result = await axios.get(apiUrl, { headers });

      result?.data?.data.forEach(async e => {
        if (e.symbol == 'MINA') {
          const tokenMina = await this.tokenPriceRepository.getTokenPriceBySymbol('MINA');
          if (!tokenMina) {
            this.tokenPriceRepository.save(new TokenPrice({ symbol: 'MINA', priceUsd: e.quote.USD.price || 1 }));
          } else {
            tokenMina.priceUsd = e.quote.USD.price;
            tokenMina.save();
          }
        }
        if (e.symbol == 'ETH') {
          const tokenMina = await this.tokenPriceRepository.getTokenPriceBySymbol('ETH');
          if (!tokenMina) {
            this.tokenPriceRepository.save(new TokenPrice({ symbol: 'ETH', priceUsd: e.quote.USD.price || 2300 }));
          } else {
            tokenMina.priceUsd = e.quote.USD.price;
            tokenMina.save();
          }
        }
      });
    } catch (error) {
      throw error;
    } finally {
    }
  }
}
