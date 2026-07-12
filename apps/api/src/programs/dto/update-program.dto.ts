import { IsString, IsOptional, IsObject, IsIn, MaxLength } from 'class-validator';
import { IsUuidLike } from '../../common/validators/is-uuid-like.validator';

export class UpdateProgramDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Pass null to clear (make this an org-wide program again). */
  @IsOptional()
  @IsUuidLike()
  departmentId?: string | null;

  /** Full canvas layout replace — { nodes: [...], edges: [...] }. Validated shape-free here; the canvas owns its own schema. */
  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';
}
