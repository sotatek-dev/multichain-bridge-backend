import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '@constants/entity.constant';

import { BaseRepository } from '@core/base-repository';

import { TokenPrice } from '@modules/crawler/entities';

@EntityRepository(TokenPrice)
export class TokenPriceRepository extends BaseRepository<TokenPrice> {
  protected alias: ETableName = ETableName.TOKEN_PRICES;

  public async getTokenPriceBySymbol(symbol) {
    return this.createQueryBuilder(`${this.alias}`).where(`${this.alias}.symbol = :symbol`, { symbol }).getOne();
  }

  public async getTokenPriceByListSymbol(symbols) {
    console.log({ symbols });

    return this.createQueryBuilder(`${this.alias}`)
      .where(`${this.alias}.symbol IN (:...symbols)`, { symbols })
      .getMany();
  }

  public async getRateETHToMina() {
    const rate = await this.createQueryBuilder(`${this.alias}`)
      .select(
        `(select CAST(price_usd AS REAL) from token_prices tp2 where tp2.symbol = 'ETH') / (select CAST(price_usd AS REAL) from token_prices tp where tp.symbol = 'MINA') as rateETHMINA`,
      )
      .getRawOne();

    return rate;
  }
}
