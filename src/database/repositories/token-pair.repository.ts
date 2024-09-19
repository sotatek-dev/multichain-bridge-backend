import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '../../constants/entity.constant.js';
import { BaseRepository } from '../../core/base-repository.js';
import { TokenPair } from '../../modules/users/entities/tokenpair.entity.js';

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
