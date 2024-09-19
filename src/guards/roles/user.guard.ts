import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { isNotEmpty } from 'class-validator';
import { DataSource } from 'typeorm';

import { IJwtPayload } from '../../modules/auth/interfaces/auth.interface.js';
import { User } from '../../modules/users/entities/user.entity.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext) {
    const {
      user,
    }: {
      user: IJwtPayload;
    } = context.switchToHttp().getRequest();
    return isNotEmpty(user);
  }

  getUser(userId: number) {
    return this.dataSource.getRepository(User).findOne({
      where: [{ id: userId }],
    });
  }
}
