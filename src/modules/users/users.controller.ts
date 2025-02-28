import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ETableName } from '../../constants/entity.constant.js';
import { GuardPublic } from '../../guards/guard.decorator.js';
import { EstimateBridgeRequestDto } from './dto/estimate-bridge-request.dto.js';
import { GetHistoryOfUserDto, GetHistoryOfUserResponseDto } from './dto/history-response.dto.js';
import { GetProtocolFeeBodyDto } from './dto/user-request.dto.js';
import {
  EstimateBridgeResponseDto,
  GetListTokenPairResponseDto,
  GetProofOfAssetsResponseDto,
  GetProtocolFeeResponseDto,
  GetTokensPriceResponseDto,
} from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';
import { ENetworkName } from '../../constants/blockchain.constant.js';

@ApiTags('Users')
@Controller(ETableName.USERS)
export class UsersController {
  constructor(private readonly userService: UsersService) { }

  @Get('history/:address')
  @GuardPublic()
  @ApiOkResponse({ type: [GetHistoryOfUserResponseDto] })
  getHistoriesOfUser(@Param('address') address: string, @Query() query: GetHistoryOfUserDto) {
    return this.userService.getHistoriesOfUser(address, query);
  }

  @Get('daily-quota/:address/:network/:token')
  @GuardPublic()
  getDailyQuota(@Param('address') address: string, @Param('network') network: ENetworkName, @Param('token') token: string) {
    return this.userService.getDailyQuotaOfUser(address, network, token);
  }

  @Get('list-supported-pairs')
  @GuardPublic()
  @ApiOkResponse({ type: [GetListTokenPairResponseDto] })
  getListTokenPair() {
    return this.userService.getListTokenPair();
  }

  @Post('bridge/protocol-fee')
  @GuardPublic()
  @ApiOkResponse({ type: GetProtocolFeeResponseDto })
  getProtocolFee(@Body() body: GetProtocolFeeBodyDto) {
    return this.userService.getProtocolFee(body);
  }

  @Get('token/price-usd')
  @GuardPublic()
  @ApiOkResponse({ type: GetTokensPriceResponseDto })
  getTokensPrices() {
    return this.userService.getTokensPrices();
  }

  @Get('proof-of-assets')
  @GuardPublic()
  @ApiOkResponse({ type: GetProofOfAssetsResponseDto })
  getProofOfAssets() {
    return this.userService.getProofOfAssets();
  }

  @Get('estimate')
  @GuardPublic()
  @ApiOkResponse({
    type: EstimateBridgeResponseDto,
  })
  estimateBridgeTime(@Query() dto: EstimateBridgeRequestDto) {
    return this.userService.estimateBridgeTime(dto.receivedNetwork);
  }
}
