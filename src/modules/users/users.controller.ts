import { Body, Controller, Get, Post, Put, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ETableName } from '@constants/entity.constant';
import { GuardPublic } from '@guards/guard.decorator';

import { GetListTokenPairResponseDto, GetProtocolFeeResponseDto } from './dto/user-response.dto';
import { GetHistoryOfUserResponseDto, getHistoryOfUserDto } from './dto/history-response.dto';
import { UsersService } from './users.service';
import { GetProtocolFeeBodyDto } from './dto/user-request.dto';

@ApiTags('Users')
@Controller(ETableName.USERS)
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('history/:address')
  @GuardPublic()
  @ApiOkResponse({ type: [GetHistoryOfUserResponseDto] })
  getHistoriesOfUser(@Param('address') address: string, @Query() query: getHistoryOfUserDto) {
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
