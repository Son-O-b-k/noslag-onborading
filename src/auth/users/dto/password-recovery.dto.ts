import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TransformLowerCase } from 'src/common/decorators';

export class PasswordRecoveryDto {
  @IsString()
  @IsOptional()
  confirmPassword?: string;

  @IsString()
  @IsOptional()
  newPassword?: string;

  @IsString()
  @IsOptional()
  otp?: string;

  @IsOptional()
  @IsEmail()
  @IsString()
  @TransformLowerCase()
  companyEmail?: string;
}
