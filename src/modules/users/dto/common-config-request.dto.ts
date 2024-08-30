import { NumberField } from '@shared/decorators/field.decorator';

export class UpdateCommonConfigBodyDto {
  @NumberField({
    example: 50,
    maximum: 100,
    required: false,
  })
  tip: number;

  @NumberField({
    example: 500,
    maximum: 100,
    required: false,
  })
  dailyQuota: number;
}
