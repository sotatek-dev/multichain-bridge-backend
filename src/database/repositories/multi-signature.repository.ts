import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '../../constants/entity.constant.js';

import { BaseRepository } from '../../core/base-repository.js';

import { MultiSignature } from '../../modules/crawler/entities/multi-signature.entity.js';

@EntityRepository(MultiSignature)
export class MultiSignatureRepository extends BaseRepository<MultiSignature> {
  protected alias: ETableName = ETableName.MULTI_SIGNATURE;
  public async upsertErrorAndRetryMultiSignature(validator: string, txId: number, errorCode: unknown) {
    const validatorSignature = await this.findOne({
      where: { txId, validator },
    });
    if (!validatorSignature) {
      await this.save(
        new MultiSignature({
          txId,
          validator,
          retry: 1,
          errorCode,
        }),
      );
    } else {
      await this.update({ txId, validator }, { retry: ++validatorSignature.retry, errorCode });
    }
  }
}
