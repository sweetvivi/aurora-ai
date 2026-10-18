import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateVideoTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4_000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelAlias?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceFileId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastFrameFileId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceVideoFileId?: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}
