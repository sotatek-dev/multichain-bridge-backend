import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiVersion() {
    return {
      version: 'API v1.0.0',
    };
  }
}
