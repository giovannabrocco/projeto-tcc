import {
  Controller,
  Post,
  UseGuards,
  Body,
  Res,
  Req,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { User } from './models/userModel';
import { IsPublic } from './decorators/is-public.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(ThrottlerGuard, LocalAuthGuard)
  @IsPublic()
  login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(req.user as User, res);
  }

  @Post('logout')
  @IsPublic()
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req, res);
  }

  @Post('refresh')
  @IsPublic()
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }

  @Get('check-auth')
  checkAuth(@Req() req: Request) {
    return req.user;
  }
}
