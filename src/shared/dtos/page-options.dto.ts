import { EDirection } from '@constants/api.constant';

import { NumberField, StringField } from '@shared/decorators/field.decorator';

export class PageOptionsDto {
  @NumberField({
    int: true,
    minimum: 1,
    required: false,
  })
  readonly page?: number;

  @NumberField({
    int: true,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  readonly limit?: number;

  @StringField({
    required: false,
  })
  readonly orderBy?: string;

  @StringField({
    required: false,
    enum: EDirection,
  })
  readonly direction?: EDirection = EDirection.ASC;
}
