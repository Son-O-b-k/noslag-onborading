import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { TransformLowerCase } from 'src/common/decorators';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;

  @IsEmail()
  @IsString()
  @TransformLowerCase()
  companyEmail: string;
}
