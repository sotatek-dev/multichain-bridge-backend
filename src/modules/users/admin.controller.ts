import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { GuardPublic } from '@guards/guard.decorator';

import { AuthUserGuard } from '@shared/decorators/http.decorator';

import { UpdateCommonConfigBodyDto } from './dto/common-config-request.dto';
import { GetCommonConfigResponseDto } from './dto/common-config-response.dto';
import { getHistoryDto, GetHistoryOfUserResponseDto } from './dto/history-response.dto';
import { UsersService } from './users.service';

@ApiTags('Admins')
@Controller('admin')
export class AdminController {
  constructor(private readonly userService: UsersService) {}

  @Get('history')
  @GuardPublic()
  // @AuthUserGuard()
  // @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({ type: [GetHistoryOfUserResponseDto] })
  getHistoriesOfUser(@Body() query: getHistoryDto) {
    return query;
    return this.userService.getHistories(query);
  }

  @Get('common-config')
  @AuthUserGuard()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({ type: GetCommonConfigResponseDto })
  getCommonConfig() {
    return this.userService.getCommonConfig();
  }

  @Put('update-common-config/:id')
  @AuthUserGuard()
  @UseGuards(AuthGuard('jwt'))
  updateCommonConfig(@Param('id') id: number, @Body() updateConfig: UpdateCommonConfigBodyDto) {
    return this.userService.updateCommonConfig(id, updateConfig);
  }
}
