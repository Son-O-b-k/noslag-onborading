import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransformLowerCase } from 'src/common/decorators';
export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @TransformLowerCase()
  companyEmail: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  @TransformLowerCase()
  primaryContactName?: string;
}
