import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { EmailRegisterDto } from './dto/email-register.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  devLogin(@Body() input: DevLoginDto, @Req() request: Request) {
    return this.authService.devLogin(input, request);
  }

  @Public()
  @Post('email/register')
  register(@Body() input: EmailRegisterDto, @Req() request: Request) {
    return this.authService.register(input, request);
  }

  @Public()
  @Post('email/login')
  @HttpCode(HttpStatus.OK)
  emailLogin(@Body() input: EmailLoginDto, @Req() request: Request) {
    return this.authService.emailLogin(input, request);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() input: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(input.refreshToken, request);
  }

  @Get('me')
  getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser('id') userId: string, @Body() input: LogoutDto): Promise<void> {
    await this.authService.logout(userId, input.refreshToken);
  }
}
