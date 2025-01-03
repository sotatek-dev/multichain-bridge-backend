import { EEnvKey } from '../../../constants/env.constant.js';
import { NumberField, StringField } from '../../../shared/decorators/field.decorator.js';

export class UpdateCommonConfigBodyDto {
  @NumberField({
    example: 50,
    required: false,
  })
  bridgeFee: number;

  @NumberField({
    example: 500,
    required: false,
  })
  dailyQuota: number;

  @StringField({
    example: 500,
    number: {
      maxDecimalPlaces: +process.env[EEnvKey.DECIMAL_TOKEN_MINA]!,
    },
    required: false,
  })
  mintingFee: string;

  @StringField({
    example: 500,
    number: {
      maxDecimalPlaces: +process.env[EEnvKey.DECIMAL_TOKEN_EVM]!,
    },
    required: false,
  })
  unlockingFee: string;
}
