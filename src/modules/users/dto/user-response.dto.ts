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
