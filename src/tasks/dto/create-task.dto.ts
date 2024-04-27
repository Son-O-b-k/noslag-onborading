import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
  IsInt,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

enum TaskState {
  OPEN = 'OPEN',
  CANCEL = 'CANCEL',
  RECEIVE = 'RECEIVE',
  CLOSED = 'CLOSED',
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  DONE = 'DONE',
}

enum AppliesTo {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  OTHERS = 'OTHERS',
}

enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MODERATE = 'MODERATE',
  LOW = 'LOW',
}

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  taskSN: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsEnum(TaskState)
  state: TaskState;

  @IsNotEmpty()
  @IsEnum(Priority)
  priority: Priority;

  @IsNotEmpty()
  @IsEnum(AppliesTo)
  appliesTo: AppliesTo;

  // @IsNotEmpty()
  // @IsNumber()
  // userId: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  departmentIds?: number[];

  @IsInt()
  @IsOptional()
  userId?: number;

  //@IsOptional()
  //@IsObject()
  @IsNotEmpty()
  duration?: Record<string, string>;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  comments?: string;
}
