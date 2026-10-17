import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const capabilities = ['chat', 'image', 'video', 'embedding'] as const;

export class UpdateModelConfigDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  providerCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  providerModel?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(capabilities, { each: true })
  capabilities?: Array<(typeof capabilities)[number]>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  contextWindow?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
