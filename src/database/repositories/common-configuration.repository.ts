import { isArray } from 'class-validator';
import { UpdateCommonConfigBodyDto } from 'modules/users/dto/common-config-request.dto.js';
import { EntityRepository } from 'nestjs-typeorm-custom-repository';
import { In } from 'typeorm';

import { ETableName } from '../../constants/entity.constant.js';
import { BaseRepository } from '../../core/base-repository.js';
import { CommonConfig } from '../../modules/crawler/entities/common-config.entity.js';
import { GetTokensReqDto } from '../../modules/users/dto/user-request.dto.js';

@EntityRepository(CommonConfig)
export class CommonConfigRepository extends BaseRepository<CommonConfig> {
  protected alias: ETableName = ETableName.COMMON_CONFIGURATION;

  public getCommonConfig() {
    return this.createQueryBuilder(`${this.alias}`).select().getOne();
  }

  public getManyAndPagination(dto: GetTokensReqDto) {
    const qb = this.createQb();
    qb.select();
    if (isArray(dto.statuses)) {
      qb.andWhere({ status: In(dto.statuses) });
    }
    this.queryBuilderAddPagination(qb, dto);
    return qb.getManyAndCount();
  }
  public updateCommonConfig(id: number, updateConfig: UpdateCommonConfigBodyDto) {
    return this.createQueryBuilder(`${this.alias}`)
      .update(CommonConfig)
      .set(updateConfig)
      .where(`${this.alias}.id = :id`, { id })
      .execute();
  }
}
