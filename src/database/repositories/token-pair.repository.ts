import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '@constants/entity.constant';

import { BaseRepository } from '@core/base-repository';

import { TokenPair } from '@modules/users/entities/tokenpair.entity';

@EntityRepository(TokenPair)
export class TokenPairRepository extends BaseRepository<TokenPair> {
  protected alias: ETableName = ETableName.TOKEN_PAIRS;

  public async getTokenPair(tokenFromAddress, toAddress) {
    return this.createQueryBuilder(`${this.alias}`)
      .where(`${this.alias}.fromAddress = :tokenFromAddress`, { tokenFromAddress })
      .andWhere(`${this.alias}.toAddress = :toAddress`, { toAddress })
      .getOne();
  }
}
