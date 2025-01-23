import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '../../constants/entity.constant.js';
import { BaseRepository } from '../../core/base-repository.js';
import { MultiSignature } from '../../modules/crawler/entities/multi-signature.entity.js';

@EntityRepository(MultiSignature)
export class MultiSignatureRepository extends BaseRepository<MultiSignature> {
  protected alias: ETableName = ETableName.MULTI_SIGNATURE;
}
