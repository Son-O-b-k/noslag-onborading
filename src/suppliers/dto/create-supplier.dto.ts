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

enum SupplierType {
  WHOLESALER = 'WHOLESALER',
  MANUFACTURER = 'MANUFACTURER',
}
export class ContactDto {
  @IsOptional()
  @IsString()
  title?: string;

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
  supplierId: number;

  @IsNotEmpty()
  @IsString()
  supplierName: string;

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
export class CreateSupplierDto {
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
  workNumber?: string;

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

  @IsNotEmpty()
  @IsString()
  serialNumber: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  department: string;

  @IsObject()
  @IsOptional()
  contact?: Record<string, string>;

  @IsNotEmpty()
  @IsEnum(SupplierType)
  supplierType: SupplierType;

  @IsOptional()
  @IsArray()
  contacts?: ContactDto[];
}
