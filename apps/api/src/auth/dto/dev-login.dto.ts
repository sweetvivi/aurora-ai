import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DevLoginDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  displayName?: string;
}
