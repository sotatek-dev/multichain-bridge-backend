import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuthUserGuard } from '@shared/decorators/http.decorator';

import { GetHistoryOfUserResponseDto, getHistoryDto } from './dto/history-response.dto';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

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
}
