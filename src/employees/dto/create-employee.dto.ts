import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({
    example: '24-11-2023',
  })
  @IsOptional()
  @IsDate()
  dateEngaged?: Date;

  @ApiProperty({
    example: '20,0000',
  })
  @IsOptional()
  @IsString()
  salary?: number;

  @ApiProperty({
    example: '20,0000',
  })
  @IsOptional()
  @IsString()
  bonuses?: number;

  @ApiProperty({
    example: 'friday',
  })
  @IsOptional()
  @IsString()
  weekWorked?: string;

  @ApiProperty({
    example: '2256716190',
  })
  @IsOptional()
  @IsString()
  accountNumber?: number;

  @ApiProperty({
    example: '20,0000',
  })
  @IsOptional()
  @IsDate()
  bankPaymentDate?: Date;

  @ApiProperty({
    example: '20,0000',
  })
  @IsOptional()
  @IsString()
  weeklyFloat?: number;
}
