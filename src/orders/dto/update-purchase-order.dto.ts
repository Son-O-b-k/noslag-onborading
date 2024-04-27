import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

enum OrderStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECT = 'REJECT',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
}
export class UpdatePurchaseOrderDto extends PartialType(
  CreatePurchaseOrderDto,
) {
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}
