import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

class Stock {
  @IsString()
  @IsOptional()
  warehouseName?: string;

  @IsString()
  @IsOptional()
  itemName?: string;

  @IsObject()
  @IsOptional()
  purchase?: Record<string, string>;

  @IsObject()
  @IsOptional()
  sales?: Record<string, string>;

  @IsString()
  @IsOptional()
  openingStockValue?: string;

  @IsString()
  @IsOptional()
  openingStock?: string;
}

export class StockDto {
  @IsArray()
  @IsOptional()
  stocks?: Stock[];
}
