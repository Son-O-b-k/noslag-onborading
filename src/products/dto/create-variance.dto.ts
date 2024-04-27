import {
  IsArray,
  IsString,
  IsNotEmpty,
  ArrayMinSize,
  ValidateNested,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class VarianceOptionDto {
  @IsString()
  @IsOptional()
  attribute?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsOptional()
  options?: string[];
}

export class VarianceDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VarianceOptionDto)
  variances?: VarianceOptionDto[];
}

class ItemOptionDto {
  // @IsString()
  // @IsOptional()
  // itemName?: string;

  // @IsArray()
  // @ArrayMinSize(1)
  // @IsOptional()
  // options?: string[];

  @IsObject()
  @IsOptional()
  purchase?: Record<string, string>;

  @IsObject()
  @IsOptional()
  sales?: Record<string, string>;

  // @IsArray()
  // @IsOptional()
  // stocks?: Record<string, string>[];
}

export class ItemDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemOptionDto)
  items?: ItemOptionDto[];
}
