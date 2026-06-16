import { IsString, IsNotEmpty, IsOptional, MaxLength, IsArray } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
