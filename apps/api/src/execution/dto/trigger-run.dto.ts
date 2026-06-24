import { IsOptional, IsObject, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SkipNodeDto {
  @IsString()
  nodeId!: string;

  @IsOptional()
  @IsObject()