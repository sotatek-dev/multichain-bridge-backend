import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { IsDate, IsEmail, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { NumberFieldOption } from '@shared/decorators/field.decorator';
import { UseSwaggerDecorator } from '@shared/decorators/swagger.decorator';
import { BasePaginationWithSortAndSearchRequestDto } from '@shared/dtos/base-request.dto';

export class CreateUserDto {
  @UseSwaggerDecorator()
  @Expose()
  @IsString()
  email: string;

  @UseSwaggerDecorator()
  @Expose()
  @IsString()
  password: string;
}

@Exclude()
export class UpdateProfileBodyDto {
  @ApiProperty({ example: 'email' })
  @IsOptional()
  @IsString()
  @Expose()
  email: string;
}
