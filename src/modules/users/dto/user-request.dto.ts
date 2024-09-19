import { NumberField, StringField } from '../../../shared/decorators/field.decorator.js';

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

  @StringField({
    required: true,
  })
  amount: string;
}
