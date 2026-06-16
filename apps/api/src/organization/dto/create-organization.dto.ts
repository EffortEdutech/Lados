import { IsString, IsNotEmpty, Matches, MaxLength, IsOptional, IsUrl } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug may only contain lowercase letters, numbers and hyphens',
  })
  slug!: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
