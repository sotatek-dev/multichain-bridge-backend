import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from 'database/repositories/user.repository';
import { Logger } from 'log4js';
import Client from 'mina-signer';
import { toChecksumAddress } from 'web3-utils';

import { EEnvKey } from '@constants/env.constant';
import { EError } from '@constants/error.constant';

import { User } from '@modules/users/entities/user.entity';

import { httpBadRequest, httpNotFound } from '@shared/exceptions/http-exeption';
import { LoggerService } from '@shared/modules/logger/logger.service';
import { ETHBridgeContract } from '@shared/modules/web3/web3.service';

import { LoginDto, LoginMinaDto } from './dto/auth-request.dto';
import { IJwtPayload } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  private readonly logger: Logger;
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly ethBridgeContract: ETHBridgeContract,
    private readonly loggerService: LoggerService,
  ) {
    this.logger = loggerService.getLogger('AUTH_SERVICE');
  }

  async login(data: LoginDto) {
    // Validate signature and check for address in database
    if (!(await this.validateSignature(data.address, data.signature))) httpBadRequest(EError.INVALID_SIGNATURE);
    const admin = await this.validateAdminAccount(data.address, true);

    // Generate access and refresh token
    return this.getToken(admin);
  }

  async loginMina(data: LoginMinaDto) {
    try {
      if (!(await this.validateSignatureMina(data.address, data.signature)))
        throw new httpBadRequest(EError.INVALID_SIGNATURE);
      const admin = await this.validateAdminAccount(data.address, false);

      // Generate access and refresh token
      return this.getToken(admin);
    } catch (err) {
      this.logger.error('[err] auth.service.ts: ---', err);
      throw new httpBadRequest(EError.USER_NOT_FOUND);
    }
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

  private async validateSignature(address: string, signature: string) {
    try {
      const recover = await this.ethBridgeContract.recover(
        signature,
        this.configService.get(EEnvKey.ADMIN_MESSAGE_FOR_SIGN),
      );
      const checksumRecover = toChecksumAddress(recover);
      const checksumAddress = toChecksumAddress(address);

      return checksumRecover === checksumAddress;
    } catch (error) {
      httpBadRequest(EError.INVALID_SIGNATURE);
    }
  }

  private async validateSignatureMina(address: string, signature) {
    let client = new Client({ network: 'mainnet' });
    if (process.env.NODE_ENV !== 'production') {
      client = new Client({ network: 'testnet' });
    }

    const signer = {
      signature,
      publicKey: address,
      data: this.configService.get(EEnvKey.ADMIN_MESSAGE_FOR_SIGN),
    };
    return client.verifyMessage(signer);
  }

  private async validateAdminAccount(address: string, isEvm: boolean) {
    if (isEvm) {
      address = toChecksumAddress(address);
    }
    const admin = await this.userRepository.findOneBy({ walletAddress: address });

    if (!admin) httpBadRequest(EError.USER_NOT_FOUND);

    return admin;
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
}
