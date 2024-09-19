import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuthAdminGuard } from '../../shared/decorators/http.decorator.js';

import { UpdateCommonConfigBodyDto } from './dto/common-config-request.dto.js';
import { GetCommonConfigResponseDto } from './dto/common-config-response.dto.js';
import { GetHistoryOfUserDto, GetHistoryOfUserResponseDto } from './dto/history-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Admins')
@Controller('admin')
export class AdminController {
  constructor(private readonly userService: UsersService) {}

  @Get('history')
  @AuthAdminGuard()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({ type: [GetHistoryOfUserResponseDto] })
  getHistoriesOfUser(@Query() query: GetHistoryOfUserDto) {
    return this.userService.getHistories(query);
  }

  @Get('common-config')
  @AuthAdminGuard()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({ type: GetCommonConfigResponseDto })
  getCommonConfig() {
    return this.userService.getCommonConfig();
  }

  @Put('update-common-config/:id')
  @AuthAdminGuard()
  @UseGuards(AuthGuard('jwt'))
  updateCommonConfig(@Param('id') id: number, @Body() updateConfig: UpdateCommonConfigBodyDto) {
    return this.userService.updateCommonConfig(id, updateConfig);
  }
}
