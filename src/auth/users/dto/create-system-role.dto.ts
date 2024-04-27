// create-system-role.dto.ts

import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateSystemRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsObject()
  permissions: Record<string, boolean>;
}
