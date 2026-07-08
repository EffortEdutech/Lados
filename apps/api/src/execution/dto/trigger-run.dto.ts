import { IsOptional, IsObject, IsArray, ValidateNested, IsString, MaxLength } from 'class-validator';
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

  /**
   * Phase 22 S22.1 — optional dedupe key. If a non-failed run already exists
   * for this (workflowId, idempotencyKey) pair, triggerRun() returns that
   * existing run instead of starting a duplicate. Primarily for webhook/
   * scheduled triggers that may retry or double-deliver; manual UI triggers
   * typically omit this.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  idempotencyKey?: string;
}
