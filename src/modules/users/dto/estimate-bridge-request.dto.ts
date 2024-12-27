import { ENetworkName } from '../../../constants/blockchain.constant.js';
import { StringField } from '../../../shared/decorators/field.decorator.js';

export class EstimateBridgeRequestDto {
  @StringField({
    enum: ENetworkName,
  })
  receivedNetwork: ENetworkName;
}
