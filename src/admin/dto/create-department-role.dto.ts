import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';

export class DepartmentRoleDto {
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
