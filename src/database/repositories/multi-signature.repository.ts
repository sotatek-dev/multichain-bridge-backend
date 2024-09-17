import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { EDirection } from '@constants/api.constant';
import { EEventStatus, ENetworkName } from '@constants/blockchain.constant';
import { ETableName } from '@constants/entity.constant';

import { BaseRepository } from '@core/base-repository';

import { MultiSignature } from '@modules/crawler/entities/multi-signature.entity';

@EntityRepository(MultiSignature)
export class MultiSignatureRepository extends BaseRepository<MultiSignature> {
  protected alias: ETableName = ETableName.MULTI_SIGNATURE;
}
