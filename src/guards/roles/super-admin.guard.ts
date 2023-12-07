import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

import { EError } from '@constants/error.constant';

import { IJwtPayload } from '@modules/auth/interfaces/auth.interface';

import { httpForbidden } from '@shared/exceptions/http-exeption';

export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const { user } = context.switchToHttp().getRequest() as {
      user: IJwtPayload;
    };

    return true;
  }
}
