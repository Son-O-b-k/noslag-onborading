import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';

export class AddUsersToRoleDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  userIds: number[];

  @IsInt()
  roleId: number;
}
