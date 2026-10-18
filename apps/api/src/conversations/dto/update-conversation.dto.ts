import { IsString, Matches, MaxLength } from 'class-validator';

export class UpdateConversationDto {
  @IsString()
  @MaxLength(80)
  @Matches(/\S/, {
    message: '会话标题不能为空',
  })
  title!: string;
}
