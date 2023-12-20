import { ApiProperty } from "@nestjs/swagger";

export class GetCommonConfigResponseDto {
    @ApiProperty()
    id: number;
  
    @ApiProperty()
    tip: number;

    @ApiProperty()
    dailyQuota: number;

    @ApiProperty()
    asset: string;
}