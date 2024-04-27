import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsDateString,
  IsNumber,
  IsObject,
  IsDate,
  IsEnum,
  IsOptional,
  ArrayNotEmpty,
  IsInt,
} from 'class-validator';
import { TransformLowerCase } from 'src/common/decorators';

enum Type {
  SUPPLIER = 'SUPPLIER',
  CUSTOMER = 'CUSTOMER',
}

export class CreateSalesRequestDto {
  @IsNotEmpty()
  @IsString()
  REQ: string;

  @IsNotEmpty()
  @IsEnum(Type)
  type: Type;

  @IsNotEmpty()
  @IsString()
  customerName: string;

  @IsNotEmpty()
  @IsNumber()
  customerId: number;

  @IsOptional()
  @IsNumber()
  approverId?: number;

  // @IsNotEmpty()
  // @IsNumber()
  // warehouseId: number;

  @IsNotEmpty()
  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  @TransformLowerCase()
  approverName?: string;

  @IsNotEmpty()
  @IsString()
  openedBy: string;

  @IsNotEmpty()
  @IsDate()
  opened: Date;

  @IsNotEmpty()
  @IsDate()
  dueDate: Date;

  @IsNotEmpty()
  @IsString()
  totalPrice: string;

  @IsOptional()
  @IsString()
  priceListName?: string;

  @IsOptional()
  @IsNumber()
  priceListId?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  productIds?: number[];

  @IsArray()
  //@IsObject()
  itemDetails: Record<string, string>[];
}
