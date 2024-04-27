import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

enum CustomerType {
  RETAILER = 'RETAILER',
  WHOLESALER = 'WHOLESALER',
  MANUFACTURER = 'MANUFACTURER',
}

enum CustomerTypeTemp {
  RETAILER = 'RETAILER',
  WHOLESALER = 'WHOLESALER',
  MANUFACTURER = 'MANUFACTURER',
}

export class ContactDto {
  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsBoolean()
  primary?: boolean;

  @IsOptional()
  @IsString()
  businessPhone?: string;

  @IsOptional()
  @IsString()
  companyEmail?: string;

  @IsNotEmpty()
  @IsNumber()
  customerId: number;

  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  mobileNumber?: string;
}
export class CreateCustomerDto {
  @ApiProperty({
    example: 'abc@gmail.com',
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({
    example: 'abc@gmail.com',
  })
  @IsOptional()
  @IsString()
  companyEmail?: string;

  @IsOptional()
  @IsString()
  primaryContactName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  mediaLink?: string[];

  @IsObject()
  @IsOptional()
  billAddress?: Record<string, string>;

  @IsObject()
  @IsOptional()
  shippingAddress?: Record<string, string>;

  @IsOptional()
  @IsArray()
  additionalContacts?: ContactDto[];

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @IsOptional()
  @IsArray()
  contacts?: ContactDto[];

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  manager?: string;

  @IsOptional()
  @IsString()
  customerCategory?: string;

  @IsOptional()
  @IsString()
  registeredBy?: string;
}

export class CreateTempCustomerDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  companyEmail?: string;

  @IsObject()
  @IsOptional()
  billAddress?: Record<string, string>;

  @IsObject()
  @IsOptional()
  shippingAddress?: Record<string, string>;

  @IsString()
  @IsOptional()
  country?: string;

  @IsOptional()
  @IsString()
  outlet?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  manager?: string;

  @IsOptional()
  @IsEnum(CustomerTypeTemp)
  price?: CustomerTypeTemp;

  @IsOptional()
  @IsString()
  customerCategory?: string;

  @IsOptional()
  @IsString()
  servedBy?: string;

  @IsOptional()
  @IsArray()
  contacts?: ContactDto[];
}
