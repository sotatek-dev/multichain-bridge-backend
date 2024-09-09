import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ETableName } from '@constants/entity.constant';

import { GuardPublic } from '@guards/guard.decorator';

import { GetHistoryOfUserDto, GetHistoryOfUserResponseDto } from './dto/history-response.dto';
import { GetProtocolFeeBodyDto } from './dto/user-request.dto';
import { GetListTokenPairResponseDto, GetProtocolFeeResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller(ETableName.USERS)
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('history/:address')
  @GuardPublic()
  @ApiOkResponse({ type: [GetHistoryOfUserResponseDto] })
  getHistoriesOfUser(@Param('address') address: string, @Query() query: GetHistoryOfUserDto) {
    return this.userService.getHistoriesOfUser(address, query);
  }

  @Get('daily-quota/:address')
  @GuardPublic()
  getDailyQuota(@Param('address') address: string) {
    return this.userService.getDailyQuotaOfUser(address);
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
}
