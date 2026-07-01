import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class RunGroupDto {
  @IsString()
  @IsNotEmpty()
  groupId!: string;

  @IsOptional()
  @IsObject()
  testInputs?: Record<string, unknown>;
}
