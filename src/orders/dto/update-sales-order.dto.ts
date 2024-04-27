import { PartialType } from '@nestjs/swagger';
import { CreateSalesOrderDto } from './create-sales-order.dto';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

enum OrderStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECT = 'REJECT',
}
export class UpdateSalesOrderDto extends PartialType(CreateSalesOrderDto) {
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsNotEmpty()
  @IsNumber()
  requestId: number;
}
