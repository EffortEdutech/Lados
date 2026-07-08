import { IsString } from 'class-validator';
import { IsUuidLike } from '../../common/validators/is-uuid-like.validator';

export class UpsertBindingDto {
  @IsUuidLike()
  resourceId!: string;

  @IsString()
  resourceType!: string;
}
