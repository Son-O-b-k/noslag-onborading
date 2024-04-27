import { PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CreateUserDto } from 'src/auth/users/dto/create-user.dto';

class RoleDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  permissions?: string;
}

export class UserDto extends PartialType(CreateUserDto) {
  @IsArray()
  @IsOptional()
  systemRoles?: RoleDto[];

  @IsArray()
  @IsOptional()
  customRoles?: RoleDto[];
}
