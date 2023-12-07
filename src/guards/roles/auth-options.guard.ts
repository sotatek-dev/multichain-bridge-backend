import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class AuthGuardOptional implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    if (!request?.user) return request;

    const user = await this.getUser(request.user.userId);

    if (!user) {
      return request;
    }

    request.user = user;

    return request;
  }

  getUser(userId: number) {
    return this.dataSource.getRepository(User).findOne({
      where: [{ id: userId }],
    });
  }
}
