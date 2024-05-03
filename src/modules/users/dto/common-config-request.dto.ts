import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { IsNumber, IsOptional, Max } from 'class-validator';

@Exclude()
export class UpdateCommonConfigBodyDto {
  @ApiProperty({ example: 50 })
  @Max(100)
  @Type(() => Number)
  @IsNumber()
  @Expose()
  @IsOptional()
  tip: number;

  @ApiProperty({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Expose()
  dailyQuota: number;
}
