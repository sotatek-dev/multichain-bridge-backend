import { Injectable } from '@nestjs/common';

@Injectable()
export class CrawlerService {
  constructor() {}

  async handleCrawl() {
    console.log('handleCrawl');
  }
}
