import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class StreamChatDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  conversationId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelAlias?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}
