import { ETokenPairStatus } from '../../../constants/blockchain.constant.js';
import { NumberField, StringField } from '../../../shared/decorators/field.decorator.js';
import { BasePaginationRequestDto } from '../../../shared/dtos/base-request.dto.js';

export class CreateUserDto {
  @StringField({
    required: true,
    isEmail: true,
  })
  email: string;

  @StringField({
    required: true,
  })
  password: string;
}

export class UpdateProfileBodyDto {
  @StringField({
    required: true,
    isEmail: true,
  })
  email: string;
}

export class GetProtocolFeeBodyDto {
  @NumberField({
    required: true,
  })
  pairId: number;
}
export class GetTokensReqDto extends BasePaginationRequestDto {
  @StringField({ isArray: true, example: ETokenPairStatus.CREATED, required: false })
  statuses: ETokenPairStatus[];

  @StringField({ required: false })
  assetName: string;

  @StringField({ required: false })
  tokenAddress: string;
}
