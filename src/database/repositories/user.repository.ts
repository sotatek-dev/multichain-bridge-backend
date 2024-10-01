import { EntityRepository } from 'nestjs-typeorm-custom-repository';

import { ETableName } from '../../constants/entity.constant.js';
import { BaseRepository } from '../../core/base-repository.js';
import { User } from '../../modules/users/entities/user.entity.js';

@EntityRepository(User)
export class UserRepository extends BaseRepository<User> {
  protected alias: ETableName = ETableName.USERS;
}
