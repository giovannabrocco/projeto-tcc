import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { Strategy } from 'passport-local';
import { User } from '../models/userModel';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'senha',
    });
  }

  async validate(email: string, senha: string) {
    const user: User | null = await this.authService.validateUser(email, senha);

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    return user;
  }
}
