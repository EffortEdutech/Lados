import { IsArray, IsISO8601, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateConnectionDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) scopes?: string[];
  @IsOptional() @IsObject() credentials?: Record<string, unknown>;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsOptional() @IsISO8601() tokenExpiresAt?: string;
}
