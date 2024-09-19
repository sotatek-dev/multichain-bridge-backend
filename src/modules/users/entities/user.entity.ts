import { Column, Entity } from 'typeorm';

import { ETableName } from '../../../constants/entity.constant.js';

import { BaseEntityIncludeTime } from '../../../core/base.entity.js';

import { IUserInterface } from '../interfaces/user.interface.js';

@Entity(ETableName.USERS)
export class User extends BaseEntityIncludeTime implements IUserInterface {
  @Column({ name: 'wallet_address', type: 'varchar', length: '255', nullable: true })
  walletAddress: string;

  @Column({ type: 'varchar', length: '255', nullable: true })
  name: string;

  constructor(value: Partial<User>) {
    super();
    Object.assign(this, value);
  }
}
