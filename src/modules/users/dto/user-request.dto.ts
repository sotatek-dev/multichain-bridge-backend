import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

import { UseSwaggerDecorator } from '@shared/decorators/swagger.decorator';

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

export class GetProtocolFeeBodyDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  pairId: number;

  @ApiProperty({ example: 1000 })
  @IsString()
  @Expose()
  amount: string;
}
