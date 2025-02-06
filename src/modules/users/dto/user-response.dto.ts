import { ApiProperty } from '@nestjs/swagger';

import { ENetworkName } from '../../../constants/blockchain.constant.js';

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
export class GetTokensPriceResponseDto {
  @ApiProperty({ example: '2345' })
  ethPriceInUsd: string;

  @ApiProperty({ example: '1.23s' })
  minaPriceInUsd: string;
}
export class GetProofOfAssetsResponseDto {
  @ApiProperty({ example: '2345' })
  totalWethInCirculation: string;
}

export class EstimateBridgeResponseDto {
  @ApiProperty()
  receivedNetwork: ENetworkName;

  @ApiProperty({ description: 'time to wait in seconds' })
  completeTimeEstimated: number;
}
