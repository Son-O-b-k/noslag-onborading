import { IsNotEmpty, IsString } from 'class-validator';
import { TransformLowerCase } from 'src/common/decorators';

export class CreateItemGroupDto {
  @IsNotEmpty()
  @IsString()
  @TransformLowerCase()
  name: string;

  @IsNotEmpty()
  @IsString()
  unit: string;
}
