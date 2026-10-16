import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelAlias?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;
}
