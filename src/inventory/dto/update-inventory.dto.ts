import { PartialType } from '@nestjs/swagger';
import { AdjustInventoryDto } from './adjust-inventory.dto';

export class UpdateInventoryDto extends PartialType(AdjustInventoryDto) {}
