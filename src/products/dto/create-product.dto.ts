import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransformLowerCase } from 'src/common/decorators';

export class PurchaseInfoDto {
  @IsNotEmpty()
  @IsString()
  purchasePrice: string;

  @IsNotEmpty()
  @IsString()
  purchaseDescription: string;

  @IsNotEmpty()
  @IsString()
  purchaseAccount: string;
}

export class SalesInfoDto {
  @IsNotEmpty()
  @IsString()
  salesPrice: string;

  @IsNotEmpty()
  @IsString()
  salesDescription: string;

  @IsNotEmpty()
  @IsString()
  salesAccount: string;
}

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  @TransformLowerCase()
  name: string;

  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  dimensions?: string;

  @IsOptional()
  @IsString()
  volume?: string;

  @IsOptional()
  @IsString()
  unitType?: string;

  @IsOptional()
  @IsString()
  qtyPKT?: string;

  @IsOptional()
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  categories?: string;

  @IsOptional()
  @IsString()
  productCode?: string;

  @IsOptional()
  @IsString()
  inventoryTrack?: string;

  @IsOptional()
  @IsBoolean()
  setInventoryTrack?: boolean;

  @IsOptional()
  @IsString()
  baseline?: string;

  @IsOptional()
  @IsBoolean()
  setBaseline?: boolean;

  @IsOptional()
  @IsString()
  primarySupplier?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  inventoryAccount?: string;

  @IsOptional()
  @IsString()
  @TransformLowerCase()
  categoryName?: string;

  @IsObject()
  @IsOptional()
  purchase?: Record<string, string>;

  @IsObject()
  @IsOptional()
  sales?: Record<string, string>;

  @IsOptional()
  @IsArray()
  images?: [];

  // @IsNotEmpty()
  // @IsString()
  // salesPrice: string;

  // @IsNotEmpty()
  // @IsString()
  // salesDescription: string;

  // @IsNotEmpty()
  // @IsString()
  // salesAccount: string;

  // @IsNotEmpty()
  // @IsString()
  // purchasePrice: string;

  // @IsNotEmpty()
  // @IsString()
  // purchaseDescription: string;

  // @IsNotEmpty()
  // @IsString()
  // purchaseAccount: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsString()
  groupUnit?: string;
}

export class CreateUploadDto {
  @IsNotEmpty()
  @IsString()
  @TransformLowerCase()
  name: string;

  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  dimensions?: string;

  @IsOptional()
  @IsString()
  volume?: string;

  @IsOptional()
  @IsString()
  unitType?: string;

  @IsOptional()
  @IsString()
  qtyPKT?: string;

  @IsOptional()
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  categories?: string;

  @IsOptional()
  @IsString()
  productCode?: string;

  @IsOptional()
  @IsString()
  inventoryTrack?: string;

  @IsOptional()
  @IsBoolean()
  setInventoryTrack?: boolean;

  @IsOptional()
  @IsString()
  baseline?: string;

  @IsOptional()
  @IsBoolean()
  setBaseline?: boolean;

  @IsOptional()
  @IsString()
  primarySupplier?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  inventoryAccount?: string;

  @IsOptional()
  @IsString()
  @TransformLowerCase()
  categoryName?: string;

  @IsObject()
  @IsOptional()
  purchase?: Record<string, string>;

  @IsObject()
  @IsOptional()
  sales?: Record<string, string>;

  @IsOptional()
  @IsArray()
  images?: [];

  // @IsNotEmpty()
  // @IsString()
  // salesPrice: string;

  // @IsNotEmpty()
  // @IsString()
  // salesDescription: string;

  // @IsNotEmpty()
  // @IsString()
  // salesAccount: string;

  // @IsNotEmpty()
  // @IsString()
  // purchasePrice: string;

  // @IsNotEmpty()
  // @IsString()
  // purchaseDescription: string;

  // @IsNotEmpty()
  // @IsString()
  // purchaseAccount: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsString()
  groupUnit?: string;
}
