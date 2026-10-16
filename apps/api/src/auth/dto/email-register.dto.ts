import { IsString, MaxLength, MinLength } from 'class-validator';
import { EmailLoginDto } from './email-login.dto';

export class EmailRegisterDto extends EmailLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  displayName!: string;
}
