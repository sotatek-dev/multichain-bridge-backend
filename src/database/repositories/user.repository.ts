import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '@constants/entity.constant';

import { BaseRepository } from '@core/base-repository';

import { User } from '@modules/users/entities/user.entity';

@EntityRepository(User)
export class UserRepository extends BaseRepository<User> {
  protected alias: ETableName = ETableName.USERS;
}
