import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsDateString,
  IsNumber,
  IsObject,
  IsDate,
  IsEnum,
} from 'class-validator';
import { TransformLowerCase } from 'src/common/decorators';

enum Type {
  SUPPLIER = 'SUPPLIER',
  CUSTOMER = 'CUSTOMER',
}

export class CreatePurchaseRequestDto {
  @IsNotEmpty()
  @IsString()
  REQ: string;

  @IsNotEmpty()
  @IsString()
  supplierName: string;

  @IsNotEmpty()
  @IsEnum(Type)
  type: Type;

  @IsNotEmpty()
  @IsNumber()
  supplierId: number;

  @IsNotEmpty()
  @IsNumber()
  approverId: number;

  // @IsNotEmpty()
  // @IsNumber()
  // warehouseId: number;

  @IsNotEmpty()
  @IsString()
  location: string;

  @IsNotEmpty()
  @IsString()
  @TransformLowerCase()
  approverName: string;

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

  @IsArray()
  //@IsObject()
  itemDetails: Record<string, string>[];
}
