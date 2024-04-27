import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateSalesRequestDto } from './create-sales-request.dto';

enum RequestStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECT = 'REJECT',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
}
export class UpdateSalesRequestDto extends PartialType(CreateSalesRequestDto) {
  @IsOptional()
  @IsEnum(RequestStatus)
  state?: RequestStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}
