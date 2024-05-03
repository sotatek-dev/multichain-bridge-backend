import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserRepository } from 'database/repositories/user.repository';
import { CustomRepositoryModule } from 'nestjs-typeorm-custom-repository';

import { EEnvKey } from '@constants/env.constant';

import { UsersModule } from '@modules/users/users.module';

import { Web3Module } from '@shared/modules/web3/web3.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

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
            expiresIn: '1d',
          },
        }) as JwtModuleOptions,
      inject: [ConfigService],
    }),
    HttpModule.register({ timeout: 3000 }),
    UsersModule,
    Web3Module,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
