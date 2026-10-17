import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateImageTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
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
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  referenceFileIds?: string[];

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}
