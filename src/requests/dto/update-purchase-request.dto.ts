import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreatePurchaseRequestDto } from './create-purchase-request.dto';

enum RequestStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECT = 'REJECT',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
}
export class UpdatePurchaseRequestDto extends PartialType(
  CreatePurchaseRequestDto,
) {
  @IsOptional()
  @IsEnum(RequestStatus)
  state?: RequestStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}
