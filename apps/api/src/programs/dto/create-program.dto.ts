import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { IsUuidLike } from '../../common/validators/is-uuid-like.validator';

export class CreateProgramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Optional department scope. Omit/undefined = org-wide program. */
  @IsOptional()
  @IsUuidLike()
  departmentId?: string;
}
