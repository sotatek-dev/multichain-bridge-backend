import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString } from 'class-validator';

@Exclude()
export class SignupDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @Expose()
  email: string;

  @ApiProperty({ example: 'Abc@123' })
  @IsString()
  @IsNotEmpty()
  @Expose()
  password: string;
}

export class LoginDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signature: string;
}

class SignatureMina {
  field: string;
  scalar: string;
}
export class LoginMinaDto {
  @ApiProperty({ example: 'B62qph8sAdxKn1JChJRLzCWek7kkdi8QPLWdfhpFEMDNbM4Ficpradb' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    example: {
      field: '13103062255371554830871806571266501056569826727061194167717383802935285095667',
      scalar: '8184099996718391251128744530931690607354984861474783138892757893603123747186',
    },
  })
  @IsNotEmpty()
  signature: SignatureMina;
}

export class RefreshTokenRequestDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwicm9sZSI6InVzZXIifQ.iFGDbsCMdIiMRVr2g4oaG6_9wDGi9wkjPNEAnLsPmyU',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
