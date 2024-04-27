import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { TransformLowerCase } from 'src/common/decorators';

export class employeeResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  primaryContactName: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  @IsString()
  @IsNotEmpty()
  employeeID: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;

  @IsEmail()
  @IsString()
  @TransformLowerCase()
  companyEmail: string;
}
