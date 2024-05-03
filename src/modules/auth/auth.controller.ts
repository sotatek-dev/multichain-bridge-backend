import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { EEnvKey } from '@constants/env.constant';
import { ETH_BRIDGE_ADDRESS_INJECT, RPC_ETH_SERVICE_INJECT, RPC_SERVICE_INJECT } from '@constants/service.constant';

import { GuardPublic } from '@guards/guard.decorator';

import { IRpcService } from '@shared/modules/web3/web3.module';
import { ETHBridgeContract } from '@shared/modules/web3/web3.service';

import { AuthService } from './auth.service';
import { LoginDto, LoginMinaDto, RefreshTokenRequestDto } from './dto/auth-request.dto';
import { LoginResponseDto, MessageResponseDto, RefreshTokenResponseDto } from './dto/auth-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly ethBridgeStartBlock: number;
  constructor(
    @Inject(ETH_BRIDGE_ADDRESS_INJECT) private ethBridgeContractAddress: string,
    @Inject(RPC_SERVICE_INJECT) private rpcService: IRpcService,
    @Inject(RPC_ETH_SERVICE_INJECT) private rpcETHService: IRpcService,
    // private minaBridgeContract: MinaBridgeContract,
    private authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.ethBridgeStartBlock = this.configService.get<number>(EEnvKey.ETH_BRIDGE_START_BLOCK);
  }
  setETHBridgeAddress(newValue: string): void {
    this.ethBridgeContractAddress = newValue;
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

  // @Post('register')
  // @GuardPublic()
  // @ApiOkResponse({ type: LoginResponseDto })
  // register(@Body() body: SignupDto) {
  //   return this.authService.register(body);
  // }

  // @Post('login')
  // @GuardPublic()
  // @ApiOkResponse({ type: LoginResponseDto })
  // login(@Body() body: LoginDto) {
  //   return this.authService.login(body);
  // }

  @Post('refresh-token')
  @GuardPublic()
  @ApiOkResponse({ type: RefreshTokenResponseDto })
  refresh(@Body() token: RefreshTokenRequestDto) {
    return this.authService.refreshAccessToken(token.refreshToken);
  }

  //example web3 interact
  // @Get('web3-interact')
  // @GuardPublic()
  // async web3Interact() {
  //   const testGenerateCollectionAddress = await this.minaBridgeContract.generateCollectionAddress('TUAN1', 'TUAN1');
  //   this.setETHBridgeAddress(this.configService.get(EEnvKey.ETH_BRIDGE_CONTRACT_ADDRESS));
  //   const ethBridgeContract = new ETHBridgeContract(
  //     this.rpcETHService,
  //     this.ethBridgeContractAddress,
  //     this.ethBridgeStartBlock,
  //   );
  //   const getContractAddress = ethBridgeContract.getContractAddress();
  //   // const mintNftResult = await collectionContract.mintNFT("0xa3de5504750dcadeCC49331E6D2730978397407B");//insert address
  //   const nftBaseUri = await ethBridgeContract.getBaseURI();
  //   const latestIndex = await ethBridgeContract.latestIndex();
  //   const nftToken = await ethBridgeContract.getTokenURI(latestIndex);
  //   return { testGenerateCollectionAddress, latestIndex, nftToken, nftBaseUri, getContractAddress };
  // }
}
