import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { TransformLowerCase } from 'src/common/decorators';
export class SigninDto {
  @IsEmail()
  @IsNotEmpty()
  @TransformLowerCase()
  companyEmail: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
