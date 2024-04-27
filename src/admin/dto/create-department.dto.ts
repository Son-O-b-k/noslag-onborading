import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';

export class DepartmentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, boolean>;
}
