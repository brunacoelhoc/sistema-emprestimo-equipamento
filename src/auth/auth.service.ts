import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarUsuarioDto } from './dto/registrar-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { UsuarioRespostaDto } from './dto/usuario-resposta.dto';
import { Role } from '../../generated/prisma/enums';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Cria um usuario novo: checa e-mail duplicado, faz o hash da senha e salva
  async registrar(dto: RegistrarUsuarioDto) {
    const emailEmUso = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (emailEmUso) {
      throw new ConflictException('Já existe um usuário com esse e-mail.');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        senha: senhaHash,
        role: dto.role ?? Role.USER,
      },
    });

    return new UsuarioRespostaDto(usuario);
  }

  // Valida email/senha e assina um JWT com o id e o role do usuario
  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    // mensagem generica de proposito: nao revela se o erro foi o email ou a senha
    if (!usuario) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const payload = { sub: usuario.id, role: usuario.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }
}
