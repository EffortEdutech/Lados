import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
