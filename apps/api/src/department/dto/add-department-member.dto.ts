import { IsIn, IsOptional } from 'class-validator';
import { IsUuidLike } from '../../common/validators/is-uuid-like.validator';

export class AddDepartmentMemberDto {
  @IsUuidLike()
  userId!: string;

  @IsOptional()
  @IsIn(['owner', 'admin', 'member', 'viewer'])
  role?: string;
}
