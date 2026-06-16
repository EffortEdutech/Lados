import { IsString, IsOptional, MaxLength, IsArray, IsIn } from 'class-validator';

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
