import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

import { BasePaginationRequestDto } from '@shared/dtos/base-request.dto';

export class GetHistoryOfUserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  senderAddress: string;

  @ApiProperty()
  amountFrom: string;

  @ApiProperty()
  tokenFromAddress: string;

  @ApiProperty()
  tokenFromName: string;

  @ApiProperty()
  networkFrom: string;

  @ApiProperty()
  receiveAddress: string;

  @ApiProperty()
  amountReceived: string;

  @ApiProperty()
  tokenReceivedAddress: string;

  @ApiProperty()
  networkReceived: string;

  @ApiProperty()
  tokenReceivedName: string;

  @ApiProperty()
  protocolFee: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  blockTimeLock: string;

  @ApiProperty()
  createdAt: Date;
}

export class getHistoryOfUserDto extends BasePaginationRequestDto {}

export class getHistoryDto extends BasePaginationRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Expose()
  address: string;
}
