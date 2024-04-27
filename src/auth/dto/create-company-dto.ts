import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
} from 'class-validator';
import { TransformLowerCase } from 'src/common/decorators';

export class CreateCompanyDto {
  @IsNotEmpty()
  @IsString()
  organizationName: string;

  @IsNotEmpty()
  @IsString()
  businessLocation: string;

  @IsNotEmpty()
  @IsString()
  companyAddress: string;

  @IsNotEmpty()
  @IsNumber()
  postalCode: number;

  @IsOptional()
  @IsString()
  website?: string;

  @IsNotEmpty()
  @IsString()
  @TransformLowerCase()
  companyEmail: string;

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsNotEmpty()
  @IsString()
  industry: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  country: string;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  state: string;
}
