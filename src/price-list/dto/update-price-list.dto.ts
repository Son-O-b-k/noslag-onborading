import { PartialType } from '@nestjs/swagger';
import { CreatePriceListDto } from './create-price-list.dto';

export class UpdatePriceListDto extends PartialType(CreatePriceListDto) {}
