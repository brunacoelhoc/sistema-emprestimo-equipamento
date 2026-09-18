import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegistrarUsuarioDto } from './dto/registrar-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { UsuarioRespostaDto } from './dto/usuario-resposta.dto';

// Rotas publicas de autenticacao: criar conta e logar
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Cria o usuario e devolve os dados dele (sem a senha)
  @ApiOperation({ summary: 'Cria um novo usuario (USER ou ADMIN)' })
  @ApiCreatedResponse({
    description: 'Usuario criado com sucesso.',
    type: UsuarioRespostaDto,
  })
  @ApiBadRequestResponse({ description: 'Corpo da requisicao invalido.' })
  @ApiConflictResponse({ description: 'Ja existe um usuario com esse e-mail.' })
  @Post('register')
  registrar(@Body() dto: RegistrarUsuarioDto) {
    return this.authService.registrar(dto);
  }

  // Confere as credenciais e devolve o token JWT usado nas demais rotas
  @ApiOperation({ summary: 'Autentica com email e senha, retorna um JWT' })
  @ApiOkResponse({ description: 'Login realizado, retorna o token JWT.' })
  @ApiBadRequestResponse({ description: 'Corpo da requisicao invalido.' })
  @ApiUnauthorizedResponse({ description: 'Credenciais invalidas.' })
  @ApiTooManyRequestsResponse({
    description: 'Muitas tentativas de login. Tente novamente em instantes.',
  })
  @UseGuards(ThrottlerGuard) // limita tentativas de forca bruta na senha
  @Post('login')
  @HttpCode(200) // por padrao POST retorna 201; login convencionalmente retorna 200
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
