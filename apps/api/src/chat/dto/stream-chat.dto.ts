import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsBoolean,
  IsIn,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class StreamChatDto {
  @IsOptional()
  @IsBoolean()
  taskMode?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  conversationId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  fileIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelAlias?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  systemPrompt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  reasoningEffort?: 'high' | 'low' | 'medium';
}
