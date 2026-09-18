import { Test, TestingModule } from '@nestjs/testing';
import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Emprestimo de Equipamentos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // sufixo unico por execucao, pra nao colidir com o @unique do email
  const sufixo = Date.now();
  const adminEmail = `admin.e2e.${sufixo}@teste.com`;
  const userEmail = `user.e2e.${sufixo}@teste.com`;
  const outroEmail = `outro.e2e.${sufixo}@teste.com`;
  const senha = '123456';

  // guarda os tokens e ids gerados durante os testes, pra reaproveitar entre os blocos
  let tokenAdmin: string;
  let tokenUser: string;
  let tokenOutro: string;
  let equipamentoId: number;
  let emprestimoId: number;

  // sobe a aplicacao real com os mesmos pipes/interceptors/filters do main.ts
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // limpa os registros criados pelo teste, pra nao acumular lixo no banco
    if (emprestimoId) {
      await prisma.emprestimo.deleteMany({ where: { id: emprestimoId } });
    }
    if (equipamentoId) {
      await prisma.equipamento.deleteMany({ where: { id: equipamentoId } });
    }
    await app.close();
  });

  // healthcheck basico, so pra confirmar que a aplicacao esta de pe
  it('GET / deve responder Hello World', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  // cadastro e login: cria os usuarios (admin + 2 users) e gera os tokens usados no resto da suite
  describe('Autenticacao', () => {
    it('POST /auth/register com body invalido -> 400', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ nome: 'Teste', email: 'nao-e-email', senha: '123' })
        .expect(400);
    });

    it('POST /auth/register cria um ADMIN -> 201', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ nome: 'Admin E2E', email: adminEmail, senha, role: 'ADMIN' })
        .expect(201)
        .expect((res) => {
          expect(res.body.senha).toBeUndefined();
        });
    });

    it('POST /auth/register cria um USER -> 201', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ nome: 'User E2E', email: userEmail, senha })
        .expect(201);
    });

    it('POST /auth/register cria um segundo USER (para teste de ownership) -> 201', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ nome: 'Outro E2E', email: outroEmail, senha })
        .expect(201);
    });

    it('POST /auth/login com senha errada -> 401', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, senha: 'senhaerrada' })
        .expect(401);
    });

    it('POST /auth/login valido do ADMIN -> 200 e retorna token', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, senha })
        .expect(200);

      expect(resposta.body.accessToken).toBeDefined();
      tokenAdmin = resposta.body.accessToken;
    });

    it('POST /auth/login valido do USER -> 200 e retorna token', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userEmail, senha })
        .expect(200);

      tokenUser = resposta.body.accessToken;
    });

    it('POST /auth/login valido do segundo USER -> 200 e retorna token', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: outroEmail, senha })
        .expect(200);

      tokenOutro = resposta.body.accessToken;
    });
  });

  // CRUD de equipamento: confere autenticacao/autorizacao (RBAC) e cria o equipamento usado nos emprestimos
  describe('Equipment', () => {
    it('GET /equipment sem token -> 401', () => {
      return request(app.getHttpServer()).get('/equipment').expect(401);
    });

    it('POST /equipment como USER (sem permissao) -> 403', () => {
      return request(app.getHttpServer())
        .post('/equipment')
        .set('Authorization', `Bearer ${tokenUser}`)
        .send({ nome: 'Mouse' })
        .expect(403);
    });

    it('POST /equipment como ADMIN -> 201', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/equipment')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ nome: 'Notebook E2E', descricao: 'Para os testes' })
        .expect(201);

      equipamentoId = resposta.body.id;
    });

    it('GET /equipment autenticado -> 200', () => {
      return request(app.getHttpServer())
        .get('/equipment')
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200);
    });
  });

  // fluxo completo de emprestimo: retirar, tentar retirar de novo (regra central), devolver e listar
  describe('Loans - fluxo principal e regra central', () => {
    it('POST /loans com equipamento inexistente -> 404', () => {
      return request(app.getHttpServer())
        .post('/loans')
        .set('Authorization', `Bearer ${tokenUser}`)
        .send({ equipamentoId: 999999 })
        .expect(404);
    });

    it('POST /loans retira o equipamento -> 201 (fluxo principal)', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/loans')
        .set('Authorization', `Bearer ${tokenUser}`)
        .send({ equipamentoId })
        .expect(201);

      expect(resposta.body.status).toBe('ATIVO');
      emprestimoId = resposta.body.id;
    });

    it('POST /loans do mesmo equipamento de novo -> 409 (regra central)', () => {
      return request(app.getHttpServer())
        .post('/loans')
        .set('Authorization', `Bearer ${tokenOutro}`)
        .send({ equipamentoId })
        .expect(409);
    });

    it('PATCH /loans/:id/return de outro usuario -> 403', () => {
      return request(app.getHttpServer())
        .patch(`/loans/${emprestimoId}/return`)
        .set('Authorization', `Bearer ${tokenOutro}`)
        .expect(403);
    });

    it('PATCH /loans/:id/return do dono -> 200 (fluxo principal)', () => {
      return request(app.getHttpServer())
        .patch(`/loans/${emprestimoId}/return`)
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('DEVOLVIDO');
        });
    });

    it('PATCH /loans/:id/return de novo -> 409 (nao pode devolver duas vezes)', () => {
      return request(app.getHttpServer())
        .patch(`/loans/${emprestimoId}/return`)
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(409);
    });

    it('GET /loans/my lista o emprestimo do usuario -> 200', () => {
      return request(app.getHttpServer())
        .get('/loans/my')
        .set('Authorization', `Bearer ${tokenUser}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });
});
