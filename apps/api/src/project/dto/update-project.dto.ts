import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';
import { IsUuidLike } from '../../common/validators/is-uuid-like.validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  /**
   * Phase 22 S22.1 — optional department scope. Pass null to clear (move the
   * project back to org-wide/no department). Ownership of the referenced
   * department (same org) is enforced in ProjectService.update().
   */
  @IsOptional()
  @IsUuidLike()
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(['active', 'on_hold', 'completed', 'archived'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
