import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/global/prisma.service';
import { UsuarioService } from 'src/usuario/usuario.service';
import { JwtService } from '@nestjs/jwt';
import { User } from './models/userModel';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private UsuarioService: UsuarioService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user: User | null = await this.UsuarioService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.senha);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: User, res: Response) {
    await this.tokenGenerate(user, res);

    return { email: user.email };
  }

  async refresh(req: Request, res: Response) {
    const refreshToken = this.getCookie(req, 'refresh_token');
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não encontrado');
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      res.clearCookie('refresh_token');
      res.clearCookie('access_token');
      throw new UnauthorizedException('Refresh token expirado');
    }

    await this.prisma.refreshToken.delete({ where: { token: refreshToken } });

    await this.tokenGenerate(storedToken.user, res);

    return { email: storedToken.user.email };
  }

  async logout(req: Request, res: Response) {
    const refreshToken = this.getCookie(req, 'refresh_token');

    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return { message: 'Logout realizado com sucesso' };
  }

  private async tokenGenerate(user: User, res: Response) {
    const accessToken = this.jwtService.sign(
      {
        email: user.email,
        sub: user.id_usuario,
      },
      { expiresIn: '15m' },
    );

    const refreshToken = randomUUID();

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id_usuario,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    this.setTokenCookies(res, accessToken, refreshToken);
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutos
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });
  }

  private getCookie(req: Request, name: string): string | undefined {
    return (req.cookies as Record<string, string>)?.[name];
  }
}
