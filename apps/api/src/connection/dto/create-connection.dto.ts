import { IsArray, IsIn, IsISO8601, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { ConnectionAuthType } from '../connection.types';

export class CreateConnectionDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsString() @MinLength(1) @MaxLength(80) provider!: string;
  @IsString() @MinLength(1) @MaxLength(80) connectionType!: string;
  @IsIn(['none', 'api_key', 'basic', 'oauth2', 'webhook_secret']) authType!: ConnectionAuthType;
  @IsOptional() @IsArray() @IsString({ each: true }) scopes?: string[];
  @IsOptional() @IsObject() credentials?: Record<string, unknown>;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsOptional() @IsISO8601() tokenExpiresAt?: string;
}

