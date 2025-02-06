import { ApiProperty } from '@nestjs/swagger';

import { StringField } from '../../../shared/decorators/field.decorator.js';
import { BasePaginationRequestDto } from '../../../shared/dtos/base-request.dto.js';

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

export class GetHistoryOfUserDto extends BasePaginationRequestDto {}

export class GetHistoryDto extends BasePaginationRequestDto {
  @StringField({
    required: false,
  })
  address: string;
}
