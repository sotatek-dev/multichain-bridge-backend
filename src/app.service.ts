import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiVersion() {
    return {
      version: 'API V1.0.0',
    };
  }
}
