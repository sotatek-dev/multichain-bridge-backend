import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '../../constants/entity.constant.js';
import { BaseRepository } from '../../core/base-repository.js';
import { CommonConfig } from '../../modules/crawler/entities/common-config.entity.js';

@EntityRepository(CommonConfig)
export class CommonConfigRepository extends BaseRepository<CommonConfig> {
  protected alias: ETableName = ETableName.COMMON_CONFIGURATION;

  public getCommonConfig() {
    return this.createQueryBuilder(`${this.alias}`)
      .select([`${this.alias}.id`, `${this.alias}.tip`, `${this.alias}.dailyQuota`, `${this.alias}.asset`])
      .getOne();
  }

  public updateCommonConfig(id: number, updateConfig) {
    return this.createQueryBuilder(`${this.alias}`)
      .update(CommonConfig)
      .set(updateConfig)
      .where(`${this.alias}.id = :id`, { id })
      .execute();
  }
}
