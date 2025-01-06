import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { GuardPublic } from '../../guards/guard.decorator.js';
import { AuthAdminGuard } from '../../shared/decorators/http.decorator.js';
import { AdminService } from './admin.service.js';
import { CreateTokenReqDto } from './dto/admin-request.dto.js';
import { UpdateCommonConfigBodyDto } from './dto/common-config-request.dto.js';
import { GetCommonConfigResponseDto } from './dto/common-config-response.dto.js';
import { GetHistoryDto, GetHistoryOfUserResponseDto } from './dto/history-response.dto.js';
import { GetTokensReqDto } from './dto/user-request.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Admins')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly userService: UsersService,
    private readonly adminService: AdminService,
  ) {}

  @Get('history')
  @AuthAdminGuard()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({ type: [GetHistoryOfUserResponseDto] })
  getHistoriesOfUser(@Query() query: GetHistoryDto) {
    return this.userService.getHistories(query);
  }

  @Get('tokens')
  @GuardPublic()
  // @AuthAdminGuard()
  // @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({ type: GetCommonConfigResponseDto })
  getCommonConfig(@Query() query: GetTokensReqDto) {
    return this.adminService.getListToken(query);
  }

  @Put('token/:id')
  @AuthAdminGuard()
  @UseGuards(AuthGuard('jwt'))
  updateCommonConfig(@Param('id') id: number, @Body() updateConfig: UpdateCommonConfigBodyDto) {
    return this.userService.updateTokenConfig(id, updateConfig);
  }
  @Post('new-token')
  @AuthAdminGuard()
  @UseGuards(AuthGuard('jwt'))
  addNewToken(@Body() payload: CreateTokenReqDto) {
    return this.adminService.createNewToken(payload);
  }
}
