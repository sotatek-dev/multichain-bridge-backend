import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { EDirection } from '@constants/api.constant';

export class PageOptionsDto {
  @ApiPropertyOptional({ default: 1 })
  @Min(1)
  @IsInt()
  @Transform(({ value }) => +value)
  @IsOptional()
  readonly page?: number;

  @ApiPropertyOptional({ default: 10 })
  @Max(100)
  @Min(1)
  @IsInt()
  @Transform(({ value }) => +value)
  @IsOptional()
  readonly limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly orderBy?: string;

  @ApiPropertyOptional({ enum: EDirection })
  @IsEnum(EDirection)
  @IsOptional()
  readonly direction?: EDirection = EDirection.ASC;
}
