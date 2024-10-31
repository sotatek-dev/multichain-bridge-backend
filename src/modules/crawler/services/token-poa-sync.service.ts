import { Injectable } from '@nestjs/common';
import assert from 'assert';

import { CommonConfigRepository } from '../../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../../database/repositories/event-log.repository.js';

@Injectable()
export class POASync {
  constructor(
    private readonly commonConfigRepo: CommonConfigRepository,
    private readonly eventLogRepo: EventLogRepository,
  ) {}
  public async handleSyncPOA() {
    const currentConfig = await this.commonConfigRepo.findOneBy({});
    assert(currentConfig, 'please seed common config');

    const res = await this.eventLogRepo.getTotalTokenSupply();
    console.log(res);
  }
}
