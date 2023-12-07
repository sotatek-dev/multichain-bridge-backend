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

export class RefreshTokenRequestDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwicm9sZSI6InVzZXIifQ.iFGDbsCMdIiMRVr2g4oaG6_9wDGi9wkjPNEAnLsPmyU',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
