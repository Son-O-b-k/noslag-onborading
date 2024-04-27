import {
  IsString,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsInt,
} from 'class-validator';

enum TaskState {
  OPEN = 'OPEN',
  CANCEL = 'CANCEL',
  RECEIVE = 'RECEIVE',
  CLOSE = 'CLOSE',
}

enum OrderType {
  DRAFT = 'DRAFT',
  APPROVAL = 'APPROVAL',
}

enum OrderStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECT = 'REJECT',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
}

enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MODERATE = 'MODERATE',
  LOW = 'LOW',
}

class ItemDetail {
  @IsNotEmpty()
  @IsString()
  productName: string;

  @IsNotEmpty()
  @IsString()
  warehouseName: string;

  @IsOptional()
  @IsString()
  rate?: string;

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
  @IsString()
  quantity: string;

  @IsNotEmpty()
  @IsString()
  amount: string;

  @IsOptional()
  @IsNumber()
  productId?: number;
}

export class CreatePurchaseOrderDto {
  @IsNotEmpty()
  @IsString()
  supplierName: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsNotEmpty()
  @IsNumber()
  requestId: number;

  @IsNotEmpty()
  @IsNumber()
  supplierId: number;

  @IsOptional()
  @IsNumber()
  priceListId?: number;

  @IsOptional()
  @IsNumber()
  assignedToId?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  productIds?: number[];

  @IsNotEmpty()
  @IsString()
  SN: string;

  @IsOptional()
  @IsDate()
  purchaseOrderDate?: Date;

  @IsNotEmpty()
  @IsDate()
  shipmentDate: Date;

  @IsNotEmpty()
  @IsString()
  salesPerson: string;

  @IsOptional()
  @IsString()
  priceListName?: string;

  @IsOptional()
  @IsString()
  discount?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsNotEmpty()
  @IsEnum(Priority)
  priority: Priority;

  @IsNotEmpty()
  @IsEnum(TaskState)
  state: TaskState;

  @IsOptional()
  @IsString()
  shippingCharges?: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  itemDetails: ItemDetail[];

  @IsNotEmpty()
  @IsString()
  totalItems: string;

  @IsNotEmpty()
  @IsString()
  totalPrice: string;

  @IsOptional()
  @IsNumber()
  approverId?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  departmentIds?: number[];

  @IsOptional()
  @IsString()
  employeeDepartment?: string;

  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsNotEmpty()
  @IsEnum(OrderType)
  type: OrderType;
}
