import { ApiProperty } from '@nestjs/swagger';
export class GetProfileResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;
}

export class GetUsersResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;
}

export class GetListTokenPairResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  fromChain: string;

  @ApiProperty()
  toChain: string;

  @ApiProperty()
  fromSymbol: string;

  @ApiProperty()
  toSymbol: string;

  @ApiProperty()
  fromAddress: string;

  @ApiProperty()
  toAddress: string;

  @ApiProperty()
  fromDecimal: number;

  @ApiProperty()
  toDecimal: number;

  @ApiProperty()
  fromScAddress: string;

  @ApiProperty()
  toScAddress: string;

  @ApiProperty()
  status: string;
}

export class GetProtocolFeeResponseDto {
  @ApiProperty()
  amount: string;
}
