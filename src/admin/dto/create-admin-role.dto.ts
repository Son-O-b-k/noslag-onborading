import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';

export class AdminRoleDto {
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
