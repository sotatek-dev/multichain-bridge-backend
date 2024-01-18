import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { GuardPublic } from '@guards/guard.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @GuardPublic()
  getHello(): string {
      return this.appService.getHello();
  }
}
