import { CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { EError } from '@constants/error.constant';

import { IJwtPayload } from '@modules/auth/interfaces/auth.interface';
import { User } from '@modules/users/entities/user.entity';

import { httpForbidden } from '@shared/exceptions/http-exeption';

export class AdminGuard implements CanActivate {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext) {
    const { user } = context.switchToHttp().getRequest() as {
      user: IJwtPayload;
    };

    return true;
  }

  getUser(userId: number) {
    return this.dataSource.getRepository(User).findOne({
      where: { id: userId },
    });
  }
}
