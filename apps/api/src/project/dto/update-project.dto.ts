import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

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
