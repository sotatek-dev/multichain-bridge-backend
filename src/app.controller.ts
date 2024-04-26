import { Controller, Get } from '@nestjs/common';

import { GuardPublic } from '@guards/guard.decorator';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @GuardPublic()
  getHello(): string {
    return this.appService.getHello();
  }
}
