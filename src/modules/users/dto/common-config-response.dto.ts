import { ApiProperty } from '@nestjs/swagger';

export class GetCommonConfigResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  tip: number;

  @ApiProperty()
  dailyQuotaPerAddress: number;

  @ApiProperty()
  dailyQuotaSytem: number;

  @ApiProperty()
  asset: string;
}
