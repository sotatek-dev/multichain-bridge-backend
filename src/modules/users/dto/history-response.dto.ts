import { ApiProperty } from '@nestjs/swagger';
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
  createdAt: Date
}

export class getHistoryOfUserDto extends BasePaginationRequestDto {

}