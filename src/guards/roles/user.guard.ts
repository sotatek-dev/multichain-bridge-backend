import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { EError } from '@constants/error.constant';

import { IJwtPayload } from '@modules/auth/interfaces/auth.interface';
import { User } from '@modules/users/entities/user.entity';

import { httpBadRequest, httpForbidden } from '@shared/exceptions/http-exeption';

@Injectable()
export class UserGuard implements CanActivate {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext) {
    const { user } = context.switchToHttp().getRequest() as {
      user: IJwtPayload;
    };
    return true;
  }

  getUser(userId: number) {
    return this.dataSource.getRepository(User).findOne({
      where: [{ id: userId }],
    });
  }
}
