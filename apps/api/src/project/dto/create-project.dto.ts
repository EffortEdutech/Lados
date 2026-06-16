import { IsString, IsNotEmpty, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'code must be uppercase letters, numbers and hyphens only (e.g. PROJ-001)',
  })
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
