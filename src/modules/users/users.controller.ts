import { Body, Controller, Get, Post, Put, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ETableName } from '@constants/entity.constant';

import { IJwtPayload } from '@modules/auth/interfaces/auth.interface';

import { AuthUser } from '@shared/decorators/auth-user.decorator';
import { AuthUserGuard } from '@shared/decorators/http.decorator';
import { GuardPublic } from '@guards/guard.decorator';

import { CreateUserDto, UpdateProfileBodyDto } from './dto/user-request.dto';
import { GetProfileResponseDto } from './dto/user-response.dto';
import { GetHistoryOfUserResponseDto, getHistoryOfUserDto } from './dto/history-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller(ETableName.USERS)
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('profile')
  @AuthUserGuard()
  @ApiBearerAuth('Authorization')
  @ApiOkResponse({ type: GetProfileResponseDto })
  getProfile(@AuthUser() user: IJwtPayload) {
    return this.userService.getProfile(user.userId);
  }

  @Get('history/:address')
  @GuardPublic()
  @ApiOkResponse({ type: [GetHistoryOfUserResponseDto] })
  getHistoriesOfUser(@Param('address') address: string, @Query() query: getHistoryOfUserDto) {
    return this.userService.getHistoriesOfUser(address, query);
  }
}
