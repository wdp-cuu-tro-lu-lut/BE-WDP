import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty, Matches } from 'class-validator';

export class StartVerificationDto {
  @ApiProperty({ example: 'email', enum: ['email', 'phone'] })
  @IsEnum(['email', 'phone'] as any)
  type!: 'email' | 'phone';

  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  value!: string;
}

export class ConfirmVerificationDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
