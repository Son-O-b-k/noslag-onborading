import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { TransformLowerCase } from 'src/common/decorators';

export class CreateAdminDto {
  @IsNotEmpty()
  @IsEmail()
  @TransformLowerCase()
  email: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
