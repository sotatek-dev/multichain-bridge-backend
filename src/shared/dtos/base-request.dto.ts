import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { EDirection } from '@constants/api.constant';

export class BasePaginationRequestDto {
  @ApiProperty({ required: false })
  @Min(1)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Expose()
  limit: number;

  @ApiProperty({ required: false })
  @Min(1)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Expose()
  page: number;
}

export class BasePaginationWithSortRequestDto extends BasePaginationRequestDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Expose()
  sortBy: string;

  @ApiProperty({ enum: EDirection, required: false })
  @IsEnum(EDirection)
  @IsOptional()
  @Expose()
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
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Expose()
  search: string;
}
