import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';

export class AddUsersToDepartmentDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  userIds: number[];

  @IsInt()
  departmentId: number;
}
