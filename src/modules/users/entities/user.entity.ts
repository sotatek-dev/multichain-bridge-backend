import { Column, Entity, OneToMany } from 'typeorm';

import { ETableName } from '@constants/entity.constant';

import { BaseEntityIncludeTime } from '@core/base.entity';

import { IUserInterface } from '../interfaces/user.interface';

@Entity(ETableName.USERS)
export class User extends BaseEntityIncludeTime implements IUserInterface {
  @Column({ name: 'wallet_address', type: 'varchar', length: '255', nullable: true })
  walletAddress: string;

  @Column({ type: 'varchar', length: '255', nullable: true })
  password: string;

  constructor(value: Partial<User>) {
    super();
    Object.assign(this, value);
  }
}
