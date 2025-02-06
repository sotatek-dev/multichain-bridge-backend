import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '../../constants/entity.constant.js';
import { BaseRepository } from '../../core/base-repository.js';
import { TokenPrice } from '../../modules/crawler/entities/token-prices.entity.js';

@EntityRepository(TokenPrice)
export class TokenPriceRepository extends BaseRepository<TokenPrice> {
  protected alias: ETableName = ETableName.TOKEN_PRICES;

  public async getTokenPriceBySymbol(symbol: string) {
    return this.createQueryBuilder(`${this.alias}`).where(`${this.alias}.symbol = :symbol`, { symbol }).getOne();
  }

  public async getTokenPriceByListSymbol(symbols: string[]) {
    return this.createQueryBuilder(`${this.alias}`)
      .where(`${this.alias}.symbol IN (:...symbols)`, { symbols })
      .getMany();
  }
}
