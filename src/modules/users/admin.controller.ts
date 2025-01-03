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
  @AuthAdminGuard()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({ type: GetCommonConfigResponseDto })
  getCommonConfig() {
    return this.adminService.getListToken();
  }

  @Put('token/:id')
  @AuthAdminGuard()
  @UseGuards(AuthGuard('jwt'))
  updateCommonConfig(@Param('id') id: number, @Body() updateConfig: UpdateCommonConfigBodyDto) {
    return this.userService.updateTokenConfig(id, updateConfig);
  }
  @Post('new-token')
  @GuardPublic()
  // @AuthAdminGuard()
  // @UseGuards(AuthGuard('jwt'))
  addNewToken(@Body() payload: CreateTokenReqDto) {
    return this.adminService.createNewToken(payload);
  }
}
