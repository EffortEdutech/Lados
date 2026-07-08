import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { IsUuidLike } from '../../common/validators/is-uuid-like.validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsUuidLike()
  parentDepartmentId?: string;
}
