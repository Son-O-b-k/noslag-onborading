import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  ArrayNotEmpty,
  IsInt,
} from 'class-validator';
import { TransformLowerCase } from 'src/common/decorators';

enum ItemRate {
  MARK_UP_AND_DOWN = 'MARK_UP_AND_DOWN',
  INDIVIDUAL_RATE = 'INDIVIDUAL_RATE',
}

enum CustomerType {
  RETAILER = 'RETAILER',
  WHOLESALER = 'WHOLESALER',
  MANUFACTURER = 'MANUFACTURER',
}

enum PriceListType {
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
}

class ProductRateDto {
  @IsInt()
  productId: number;

  @IsString()
  customRate: string;
}

export class CreatePriceListDto {
  @IsString()
  @IsNotEmpty()
  @TransformLowerCase()
  name: string;

  @IsEnum(PriceListType)
  type: PriceListType;

  @IsEnum(ItemRate)
  itemRate: ItemRate;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsObject()
  percentage?: Record<string, string>;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  customRate?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayNotEmpty()
  productRates?: ProductRateDto[];

  @IsNotEmpty()
  @IsEnum(CustomerType)
  customerType: CustomerType;
}
