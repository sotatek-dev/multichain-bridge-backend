import { NumberField } from '../../../shared/decorators/field.decorator.js';

export class UpdateCommonConfigBodyDto {
  @NumberField({
    example: 50,
    required: false,
  })
  tip: number;

  @NumberField({
    example: 500,
    required: false,
  })
  dailyQuota: number;
}
