import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuthUserGuard } from '@shared/decorators/http.decorator';

import { GetHistoryOfUserResponseDto, getHistoryDto } from './dto/history-response.dto';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { GetCommonConfigResponseDto } from './dto/common-config-response.dto';
import { UpdateCommonConfigBodyDto } from './dto/common-config-request.dto';

@ApiTags('Admins')
@Controller('admin')
export class AdminController {
  constructor(private readonly userService: UsersService) {}

  @Get('history')
  @AuthUserGuard()
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({ type: [GetHistoryOfUserResponseDto] })
  getHistoriesOfUser(@Query() query: getHistoryDto) {
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
