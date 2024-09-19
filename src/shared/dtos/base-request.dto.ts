import { ApiProperty } from '@nestjs/swagger';

import { EDirection } from '../../constants/api.constant.js';

import { NumberField, StringField } from '../decorators/field.decorator.js';

export class BasePaginationRequestDto {
  @NumberField({
    required: false,
    minimum: 1,
    example: 10,
  })
  limit: number;

  @NumberField({
    required: false,
    minimum: 1,
    example: 1,
  })
  page: number;
}

export class BasePaginationWithSortRequestDto extends BasePaginationRequestDto {
  @StringField({
    required: false,
  })
  sortBy: string;

  @StringField({
    required: false,
    enum: EDirection,
  })
  direction: EDirection;
}

export class BasePaginationResponseDto<T = any> {
  @ApiProperty()
  total: number;

  data: T[];

  static convertToPaginationResponse<T = any>(data: [any[], number], currentPage?: number) {
    return {
      data: data[0],
      total: data[1],
      currentPage,
    } as BasePaginationResponseDto<T>;
  }
}

export class BasePaginationWithSortAndSearchRequestDto extends BasePaginationWithSortRequestDto {
  @StringField({
    required: false,
  })
  search: string;
}
