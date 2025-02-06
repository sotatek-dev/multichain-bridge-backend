import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { JWT_TOKEN_EXPIRE_DURATION } from '../../constants/api.constant.js';
import { EEnvKey } from '../../constants/env.constant.js';
import { UserRepository } from '../../database/repositories/user.repository.js';
import { UsersModule } from '../../modules/users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    CustomRepositoryModule.forFeature([UserRepository]),
    PassportModule.register([{ defaultStrategy: 'jwt' }, { defaultStrategy: 'azure-ad' }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        ({
          secret: configService.get(EEnvKey.JWT_SECRET_KEY),
          signOptions: {
            expiresIn: JWT_TOKEN_EXPIRE_DURATION,
          },
        }) as JwtModuleOptions,
      inject: [ConfigService],
    }),
    HttpModule.register({ timeout: 3000 }),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
