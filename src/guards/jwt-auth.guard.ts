import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { EGuardDecoratorKey } from '../constants/guards.constant.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(EGuardDecoratorKey.IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const isPublicOrAuth = this.reflector.getAllAndOverride<boolean>(EGuardDecoratorKey.IS_PUBLIC_OR_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublicOrAuth) {
      const { headers } = context.switchToHttp().getRequest();
      const jwtToken = (headers.authorization || '').split(' ')[1] || null;

      if (!jwtToken) return true;
    }

    return super.canActivate(context);
  }
}
