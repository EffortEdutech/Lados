import { IsString, IsOptional, MaxLength } from 'class-validator';
import { IsUuidLike } from '../../common/validators/is-uuid-like.validator';

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  /** Pass null to clear (make this a top-level department again). */
  @IsOptional()
  @IsUuidLike()
  parentDepartmentId?: string | null;
}
