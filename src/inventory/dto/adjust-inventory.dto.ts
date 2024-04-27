import {
  IsNotEmpty,
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  Validate,
  IsNumber,
  IsDate,
} from 'class-validator';
import { IsValidItemDetails } from 'src/common/inputValidators';

enum AdjustmentType {
  QUANTITY = 'QUANTITY',
  VALUE = 'VALUE',
}

export class AdjustInventoryDto {
  @IsEnum(AdjustmentType)
  type: AdjustmentType;

  @IsNotEmpty()
  @IsDate()
  dateAdjusted: Date;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  account: string;

  @IsString()
  @IsOptional()
  warehouseName?: string;

  @IsNumber()
  @IsOptional()
  warehouseId?: number;

  @IsNotEmpty()
  @IsArray()
  @Validate(IsValidItemDetails, { message: 'Invalid item details' })
  itemDetails: Record<string, string>[];
}

export interface DebtorInfo {
  customerId: number;
  customerName: string;
  totalInvoiceAmount: number;
  totalPaymentAmount: number;
  balance: number;
}

export interface DebtorsReport {
  status: boolean;
  message: string;
  debtorsInfo: DebtorInfo[];
  totalBalance: number;
  totalPaymentsMade: number;
}
