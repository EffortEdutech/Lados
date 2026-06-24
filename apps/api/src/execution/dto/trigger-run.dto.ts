import { IsOptional, IsObject, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SkipNodeDto {
  @IsString()
  nodeId!: string;

  @IsOptional()
  @IsObject()
  outputs?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class TriggerRunDto {
  @IsOptional()
  @IsObject()
  inputs?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  /**
   * Phase 11 — AI workflow trigger skip specs.
   * Each entry names a node to bypass and provides its injected outputs
   * so downstream nodes still receive the data they expect.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkipNodeDto)
  skipNodes?: SkipNodeDto[];
}
