import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const capabilities = ['chat', 'embedding', 'image', 'video', 'vision'] as const;

export class DiscoveredModelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  providerModel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsIn(capabilities, { each: true })
  capabilities!: Array<(typeof capabilities)[number]>;

  @IsOptional()
  @IsBoolean()
  enabled = true;
}

export class ImportDiscoveredModelsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9][a-z0-9_-]*$/)
  providerCode!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DiscoveredModelDto)
  models!: DiscoveredModelDto[];
}
