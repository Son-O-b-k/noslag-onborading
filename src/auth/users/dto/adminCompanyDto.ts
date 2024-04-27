import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAdminCompanyDto {
  @ApiProperty({
    example: 'NoSlag',
  })
  @IsNotEmpty()
  @IsString()
  organizationName: string;

  @ApiProperty({
    example: '23 Express way',
  })
  @IsNotEmpty()
  @IsString()
  companyAddress: string;

  @ApiProperty({
    example: 'https://noslag.com',
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({
    example: '23 Express way',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'Lagos',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    example: 'Lekki',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: 'Nigeria',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    example: 'Niara',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    example: 'Fintech',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({
    example: '23 Express way',
  })
  @IsOptional()
  @IsString()
  businessLocation?: string;

  @ApiProperty({
    example: '56427',
  })
  @IsOptional()
  @IsString()
  postalCode?: number;
}
