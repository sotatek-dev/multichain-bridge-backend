import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiVersion() {
    return {
      version: 'v1.0.0',
    };
  }
}
