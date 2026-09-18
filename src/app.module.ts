import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EquipamentoModule } from './equipamento/equipamento.module';
import { EmprestimoModule } from './emprestimo/emprestimo.module';

@Module({
  // isGlobal: true carrega o .env uma unica vez e deixa process.env
  // disponivel em qualquer lugar (inclusive no PrismaService, que le
  // DATABASE_URL direto no construtor).
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // falha logo no boot se faltar alguma variavel critica, em vez de
      // deixar o erro aparecer confuso (ex: 500) na primeira request que usar
      validate: (env: Record<string, unknown>) => {
        for (const chave of ['DATABASE_URL', 'JWT_SECRET']) {
          if (!env[chave]) {
            throw new Error(
              `Variavel de ambiente obrigatoria ausente: ${chave}`,
            );
          }
        }
        return env;
      },
    }),
    // usado no login pra limitar tentativas de forca bruta (5 por minuto por IP)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
    PrismaModule,
    AuthModule,
    EquipamentoModule,
    EmprestimoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
