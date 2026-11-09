import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public, SemBloqueio, UsuarioAtual } from '../common/decorators';
import { UsuarioAutenticado } from '../common/types';
import { AuthService } from './auth.service';
import { AlterarSenhaDto, EsqueciSenhaDto, LoginDto, RedefinirSenhaDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // UC001 — limite anti força-bruta: 10 tentativas por minuto por IP
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.senha);
  }

  @Get('me')
  me(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.auth.me(u.idUsuario);
  }

  @SemBloqueio()
  @Post('alterar-senha')
  alterarSenha(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: AlterarSenhaDto) {
    return this.auth.alterarSenha(u.idUsuario, dto.senhaAtual, dto.novaSenha);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('esqueci-senha')
  esqueciSenha(@Body() dto: EsqueciSenhaDto) {
    return this.auth.esqueciSenha(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('redefinir-senha')
  redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    return this.auth.redefinirSenha(dto.token, dto.novaSenha);
  }
}
