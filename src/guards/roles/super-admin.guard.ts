import { CanActivate, ExecutionContext } from '@nestjs/common';
import { isNotEmpty } from 'class-validator';
import { Observable } from 'rxjs';

import { IJwtPayload } from '@modules/auth/interfaces/auth.interface';

export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const { user } = context.switchToHttp().getRequest() as {
      user: IJwtPayload;
    };

    return isNotEmpty(user);
  }
}
