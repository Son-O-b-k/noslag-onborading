import { PartialType } from '@nestjs/swagger';
import { StockDto } from './create-stock.dto';

export class UpdateStockDto extends PartialType(StockDto) {}
