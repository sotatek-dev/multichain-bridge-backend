import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from 'database/repositories/user.repository';
import { DataSource, Not, QueryRunner } from 'typeorm';

import { EEnvKey } from '@constants/env.constant';
import { EError } from '@constants/error.constant';

import { User } from '@modules/users/entities/user.entity';

import { toChecksumAddress } from 'web3-utils';
import Client from 'mina-signer';

import { httpBadRequest, httpNotFound } from '@shared/exceptions/http-exeption';
import { generateHash, validateHash } from '@shared/utils/hash-string';

import { LoginDto, LoginMinaDto, SignupDto } from './dto/auth-request.dto';
import { IJwtPayload, IUpdateEmail } from './interfaces/auth.interface';
import Web3 from 'web3';
import { ETHBridgeContract } from '@shared/modules/web3/web3.service';

@Injectable()
export class AuthService {
  private web3: Web3;
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly ethBridgeContract: ETHBridgeContract,
    private dataSource: DataSource,
  ) {}

  async login(data: LoginDto) {
    try {
      // Validate signature and check for address in database
      if (!this.validateSignature(data.address, data.signature)) throw new Error('Invalid signature');
      const admin = await this.validateAdminAccount(data.address, true);

      // Generate access and refresh token
      return this.getToken(admin);
    } catch (err) {
        console.log('[err] auth.service.ts: ---', err);
        throw new httpBadRequest(EError.USER_NOT_FOUND);
    }
  }

  async loginMina(data: LoginMinaDto) {
    try {
      if(! await this.validateSignatureMina(data.address, data.signature)) throw new httpBadRequest(EError.INVALID_SIGNATURE);
      const admin = await this.validateAdminAccount(data.address, false);

      // Generate access and refresh token
      return this.getToken(admin);
    } catch (err) {
        console.log('[err] auth.service.ts: ---', err);
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
    const recover = await this.ethBridgeContract.recover(signature, this.configService.get(EEnvKey.ADMIN_MESSAGE_FOR_SIGN))
    const checksumRecover = toChecksumAddress(recover);
    const checksumAddress = toChecksumAddress(address);

    return checksumRecover === checksumAddress;
  }

  private async validateSignatureMina(address: string, signature) {
    const client = new Client({ network: 'mainnet' });
    const signer = {
      signature,
      publicKey: address,
      data: this.configService.get(EEnvKey.ADMIN_MESSAGE_FOR_SIGN)
    }
    return client.verifyMessage(signer)

  }

  private async validateAdminAccount(address: string, is_evm: boolean) {
    if(is_evm) {
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

  // async register(data: SignupDto) {
  //   const { email, password } = data;
  //   const hashedPassword = await generateHash(password);
  //   const newUserData = {
  //     email,
  //     password: hashedPassword,
  //   };
  //   const newUser = await this.userRepository.save(newUserData);
  //   return this.getToken(newUser);
  // }
}
