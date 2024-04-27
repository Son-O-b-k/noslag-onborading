// create-order-confirmation.dto.ts

import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

// export class CreateOrderConfirmationDto {
//   @IsNotEmpty()
//   @IsNumber()
//   orderId: number;

//   @IsNotEmpty()
//   @IsNumber()
//   productId: number;

//   @IsNotEmpty()
//   @IsNumber()
//   quantity: number;

//   @IsString()
//   @IsOptional()
//   comment?: string;

//   @IsString()
//   @IsOptional()
//   rate?: string;

//   @IsBoolean()
//   @IsOptional()
//   received?: boolean;

//   // Constructor to initialize the object
//   constructor(
//     orderId: number,
//     productId: number,
//     quantity: number,
//     received: boolean,
//     comment?: string,
//     rate?: string,
//   ) {
//     (this.orderId = orderId),
//       (this.productId = productId),
//       (this.quantity = quantity);
//     this.comment = comment;
//     this.received = received;
//     this.rate = rate;
//   }
// }

class ItemDetail {
  @IsNotEmpty()
  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  unitType?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  baseQty?: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  rate?: string;

  @IsBoolean()
  @IsOptional()
  received?: boolean;

  @IsString()
  @IsNotEmpty()
  warehouseName: string;

  @IsNotEmpty()
  @IsNumber()
  productId: number;
}

export class CreateOrderConfirmationDto {
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  itemDetails: ItemDetail[];

  @IsNotEmpty()
  @IsNumber()
  orderId: number;
}
