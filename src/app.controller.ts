import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service.js';
import { GuardPublic } from './guards/guard.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @GuardPublic()
  getHello() {
    return this.appService.getApiVersion();
  }
}
