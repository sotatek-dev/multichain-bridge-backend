import { Injectable } from '@nestjs/common';

import { CommonConfigRepository } from '../../../database/repositories/common-configuration.repository.js';
import { EventLogRepository } from '../../../database/repositories/event-log.repository.js';

@Injectable()
export class POASync {
  constructor(
    private readonly commonConfigRepo: CommonConfigRepository,
    private readonly eventLogRepo: EventLogRepository,
  ) {}
  public async handleSyncPOA() {
    // TODO: update this to adapt adding new Token.
    // const currentConfig = await this.commonConfigRepo.findOneBy({});
    // assert(currentConfig, 'please seed common config');
    // const mina = await this.eventLogRepo.getTotalAmoutFromNetworkReceived(ENetworkName.MINA);
    // const eth = await this.eventLogRepo.getTotalAmoutFromNetworkReceived(ENetworkName.ETH);
    // await this.commonConfigRepo.update(currentConfig.id, {
    //   totalWethBurnt: eth.amountFromTotal,
    //   totalWethMinted: mina.amountReceivedTotal,
    // });
  }
}
