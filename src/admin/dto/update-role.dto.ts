import { PartialType } from '@nestjs/swagger';
import { CustomRoleDto } from './custom-role.dto';

export class UpdateRoleDto extends PartialType(CustomRoleDto) {}
