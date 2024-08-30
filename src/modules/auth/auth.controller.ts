import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { EEnvKey } from '@constants/env.constant';

import { GuardPublic } from '@guards/guard.decorator';

import { IRpcService } from '@shared/modules/web3/web3.module';

import { AuthService } from './auth.service';
import { LoginDto, LoginMinaDto, RefreshTokenRequestDto } from './dto/auth-request.dto';
import { LoginResponseDto, MessageResponseDto, RefreshTokenResponseDto } from './dto/auth-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly ethBridgeStartBlock: number;
  constructor(
    private authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.ethBridgeStartBlock = this.configService.get<number>(EEnvKey.ETH_BRIDGE_START_BLOCK);
  }

  @Post('/login-admin-evm')
  @GuardPublic()
  @ApiOkResponse({ type: LoginResponseDto })
  loginAdminEVM(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('/login-admin-mina')
  @GuardPublic()
  @ApiOkResponse({ type: LoginResponseDto })
  loginAdminMina(@Body() body: LoginMinaDto) {
    return this.authService.loginMina(body);
  }

  @Get('/admin/login-message')
  @ApiOkResponse({ type: MessageResponseDto })
  @GuardPublic()
  loginMesage() {
    return { message: this.configService.get(EEnvKey.ADMIN_MESSAGE_FOR_SIGN) };
  }

  @Post('refresh-token')
  @GuardPublic()
  @ApiOkResponse({ type: RefreshTokenResponseDto })
  refresh(@Body() token: RefreshTokenRequestDto) {
    return this.authService.refreshAccessToken(token.refreshToken);
  }
}
