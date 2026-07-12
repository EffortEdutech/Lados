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

  /**
   * Phase 24 S24.6 — optional parent Program (the real projects.program_id
   * FK added in S24.1). Pass null to clear (move the project back to
   * standalone/no program). Ownership of the referenced program (same org)
   * is enforced in ProjectService.update(), mirroring departmentId exactly.
   */
  @IsOptional()
  @IsUuidLike()
  programId?: string | null;

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
