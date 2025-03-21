import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ExtractJwt, Strategy } from 'passport-jwt';

import { EEnvKey } from '../../../constants/env.constant.js';
import { IJwtPayload } from '../interfaces/auth.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(public readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get(EEnvKey.JWT_SECRET_KEY),
    });
  }

  async validate(payload: IJwtPayload) {
    return payload;
  }
}
