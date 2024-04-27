import {
  IsNotEmpty,
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  Validate,
  IsNumber,
  IsDate,
  IsInt,
} from 'class-validator';
import { IsValidItemDetails } from 'src/common/inputValidators';

enum Transfer {
  Pending = 'Pending',
  Approved = 'Approved',
}

export class TransferDto {
  // @IsEnum(Transfer)
  // type: Transfer;

  @IsNotEmpty()
  @IsDate()
  dateInitiated: Date;

  @IsNotEmpty()
  @IsDate()
  dueDate: Date;

  @IsString()
  @IsNotEmpty()
  approverName: string;

  @IsString()
  @IsNotEmpty()
  requestNumber: string;

  @IsInt()
  @IsNotEmpty()
  approverId: number;

  @IsString()
  @IsNotEmpty()
  receivingWarehouseName: string;

  @IsInt()
  @IsNotEmpty()
  receivingWarehouseId: number;

  @IsString()
  @IsNotEmpty()
  sendingWarehouseName: string;

  @IsInt()
  @IsNotEmpty()
  sendingWarehouseId: number;

  @IsNotEmpty()
  @IsArray()
  @Validate(IsValidItemDetails, { message: 'Invalid item details' })
  itemDetails: Record<string, string>[];
}
