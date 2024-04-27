import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TransferDto } from './warehouse-transfer.dto';

enum RequestStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECT = 'REJECT',
  CONFIRM = 'CONFIRM',
  // AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION',
}
export class UpdateRequestDto extends PartialType(TransferDto) {
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}
