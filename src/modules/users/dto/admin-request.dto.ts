import { NumberField, StringField } from '../../../shared/decorators/field.decorator.js';

export class CreateTokenReqDto {
  @StringField({
    isEthereumAddress: true, // may support other chains than ETH in future.
  })
  assetAddress: string;

  @StringField({
    minimum: 0,
    number: true,
  })
  minAmountToBridge: string;

  @StringField({
    minimum: 0,
    number: true,
  })
  maxAmountToBridge: string;

  @NumberField({
    minimum: 0,
  })
  dailyQuota: number;

  @NumberField({
    minimum: 0,
  })
  bridgeFee: number;

  @StringField({
    minimum: 0,
    number: true,
  })
  unlockingFee: string;

  @StringField({
    minimum: 0,
    number: true,
  })
  mintingFee: string;
}
