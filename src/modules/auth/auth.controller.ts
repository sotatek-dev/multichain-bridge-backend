import { Body, Controller, Get, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { EEnvKey } from '../../constants/env.constant.js';
import { GuardPublic } from '../../guards/guard.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto, LoginMinaDto, RefreshTokenRequestDto } from './dto/auth-request.dto.js';
import { LoginResponseDto, MessageResponseDto, RefreshTokenResponseDto } from './dto/auth-response.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

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
