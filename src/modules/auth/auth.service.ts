import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from 'database/repositories/user.repository';
import { DataSource, Not, QueryRunner } from 'typeorm';

import { EEnvKey } from '@constants/env.constant';
import { EError } from '@constants/error.constant';

import { User } from '@modules/users/entities/user.entity';

import { httpBadRequest, httpInternalServerErrorException, httpNotFound } from '@shared/exceptions/http-exeption';
import { isPhoneNumberValid } from '@shared/utils/check-object';
import { generateHash, validateHash } from '@shared/utils/hash-string';
import { decode } from '@shared/utils/util';

import { LoginDto, SignupDto } from './dto/auth-request.dto';
import { IJwtPayload, IUpdateEmail } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly userRepository: UserRepository,
    private dataSource: DataSource,
  ) {}

  async login(data: LoginDto) {
    const user = await this.userRepository.findOne({
      where: {
        email: data.email,
      },
    });

    if (!user || user.password === null) httpBadRequest(EError.WRONG_EMAIL_OR_PASS);

    const checkPassword = await validateHash(data.password, user.password);

    if (!checkPassword) httpBadRequest(EError.WRONG_EMAIL_OR_PASS);

    return this.getToken(user);
  }

  private async getToken(user: User) {
    const refreshTokenSecret = this.configService.get<string>(EEnvKey.JWT_REFRESH_SECRET_KEY);
    const payload = {
      userId: user.id,
      isVerified: true,
    } as IJwtPayload;
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get(EEnvKey.JWT_ACCESS_TOKEN_EXPIRE),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshTokenSecret,
      expiresIn: this.configService.get(EEnvKey.JWT_REFRESH_TOKEN_EXPIRE),
    });

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string) {
    const secret = this.configService.get<string>(EEnvKey.JWT_REFRESH_SECRET_KEY);
    let jwtData: IJwtPayload;
    try {
      jwtData = this.jwtService.verify(refreshToken, {
        secret,
      }) as IJwtPayload;
    } catch (error) {
      httpBadRequest(EError.INVALID_TOKEN);
    }

    const user = await this.userRepository.findOne({
      where: { id: jwtData.userId },
    });

    if (!user) httpNotFound(EError.USER_NOT_FOUND);

    return this.getToken(user);
  }

  async register(data: SignupDto) {
    const { email, password } = data;
    const hashedPassword = await generateHash(password);
    const newUserData = {
      email,
      password: hashedPassword,
    };
    const newUser = await this.userRepository.save(newUserData);
    return this.getToken(newUser);
  }
}
