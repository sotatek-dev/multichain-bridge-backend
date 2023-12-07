import { Body, Controller, Get, Inject, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { GuardPublic } from '@guards/guard.decorator';

import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenRequestDto, SignupDto } from './dto/auth-request.dto';
import { LoginResponseDto, RefreshTokenResponseDto } from './dto/auth-response.dto';
import { CollectionContract, MinaBridgeContract } from '@shared/modules/web3/web3.service';
import { COLLECTION_ADDRESS_INJECT, RPC_SERVICE_INJECT } from '@constants/service.constant';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(COLLECTION_ADDRESS_INJECT) private collectionContractAddress: string,
    @Inject(RPC_SERVICE_INJECT) private rpcService: string,
    private minaBridgeContract: MinaBridgeContract,
    private authService: AuthService
  ) {}
  setCollectionAddress(newValue: string): void {
    this.collectionContractAddress = newValue;
  }

  @Post('register')
  @GuardPublic()
  @ApiOkResponse({ type: LoginResponseDto })
  register(@Body() body: SignupDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @GuardPublic()
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('refresh-token')
  @GuardPublic()
  @ApiOkResponse({ type: RefreshTokenResponseDto })
  refresh(@Body() token: RefreshTokenRequestDto) {
    return this.authService.refreshAccessToken(token.refreshToken);
  }

  //example web3 interact
  @Get('web3-interact')
  @GuardPublic()
  async web3Interact() {
    const testGenerateCollectionAddress = await this.minaBridgeContract.generateCollectionAddress("TUAN1", "TUAN1");
    this.setCollectionAddress("0xe2d2fb55578f84B866FBC5e0c736cCE7956C1fcB");
    const collectionContract = new CollectionContract(this.rpcService, this.collectionContractAddress);
    const getContractAddress = collectionContract.getContractAddress();
    // const mintNftResult = await collectionContract.mintNFT("0xa3de5504750dcadeCC49331E6D2730978397407B");//insert address
    const nftBaseUri = await collectionContract.getBaseURI();
    const latestIndex = await collectionContract.latestIndex();
    const nftToken = await collectionContract.getTokenURI(latestIndex);
    return { testGenerateCollectionAddress, latestIndex, nftToken, nftBaseUri, getContractAddress };
  }
}
