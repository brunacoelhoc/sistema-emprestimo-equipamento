# API de Empréstimo de Equipamentos

API REST para gerenciamento de empréstimo de equipamentos, com autenticação via JWT e dois perfis de acesso (`USER` e `ADMIN`).

## Stack

- [NestJS](https://nestjs.com/) + TypeScript
- [PostgreSQL](https://www.postgresql.org/)
- [Prisma ORM](https://www.prisma.io/) 7.10.0 (com driver adapter, sem engine binária)
- Autenticação JWT (`@nestjs/jwt` + `passport-jwt`)
- Validação de entrada com `class-validator`
- Documentação interativa com Swagger (`@nestjs/swagger`)
- Rate limiting (`@nestjs/throttler`), CORS e cabeçalhos de segurança (`helmet`)
- Testes e2e com Jest + Supertest

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- [PostgreSQL](https://www.postgresql.org/download/) 14 ou superior, rodando localmente ou acessível pela rede

## Instalação

```bash
npm install
```

## Configuração

Copie o arquivo de exemplo e preencha com os valores do seu ambiente:

```bash
cp .env.example .env
```

Variáveis necessárias:

| Variável       | Descrição                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL` | String de conexão do PostgreSQL (`postgresql://usuario:senha@host:porta/banco?schema=public`) |
| `PORT`         | Porta em que a API vai rodar (opcional, padrão `3000`)                     |
| `JWT_SECRET`   | Chave secreta usada para assinar os tokens JWT                             |

Para gerar uma chave aleatória para o `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> A aplicação valida essas variáveis na inicialização — se `DATABASE_URL` ou `JWT_SECRET` estiverem ausentes, o boot falha com uma mensagem explicando qual variável falta.

## Banco de dados

Com o PostgreSQL rodando e o `DATABASE_URL` configurado, crie o banco (se ainda não existir) e aplique as migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

O `prisma generate` já roda automaticamente após as migrations em ambiente de desenvolvimento (`npx prisma migrate dev`), mas rodá-lo manualmente garante que o Prisma Client esteja atualizado.

### Seed (usuário ADMIN inicial)

Como não há um endpoint de cadastro protegido nos requisitos mínimos, o seed cria um `ADMIN` padrão para você começar a testar:

```bash
npm run seed
```

Cria (se ainda não existir) o usuário `admin@sistema.com` / senha `admin123`. É seguro rodar mais de uma vez — se o admin já existir, o script não faz nada.

## Executando a aplicação

```bash
# desenvolvimento (com reload automático)
npm run start:dev

# build de produção
npm run build
npm run start:prod
```

A API sobe em `http://localhost:3000` (ou na porta definida em `PORT`).

## Documentação da API (Swagger)

Com a aplicação rodando, a documentação interativa fica disponível em:

```
http://localhost:3000/docs
```

Para testar rotas autenticadas: faça login em `POST /auth/login`, copie o `accessToken` da resposta, clique em **Authorize** no topo da página e cole o token (sem o prefixo `Bearer`).

## Testes

```bash
# testes unitários
npm run test

# testes end-to-end (sobem a aplicação e usam o banco configurado no .env)
npm run test:e2e
```

## Endpoints

Todas as rotas (exceto `/auth/*`) exigem o header `Authorization: Bearer <token>`.

| Método  | Rota                 | Acesso           | Descrição                                            |
| ------- | -------------------- | ---------------- | ----------------------------------------------------- |
| `POST`  | `/auth/register`     | Público          | Cria um usuário (`USER` por padrão, ou `ADMIN`)        |
| `POST`  | `/auth/login`        | Público          | Autentica e retorna um `accessToken` (JWT)             |
| `POST`  | `/equipment`         | `ADMIN`          | Cadastra um equipamento                                |
| `GET`   | `/equipment`         | Autenticado      | Lista os equipamentos                                  |
| `POST`  | `/loans`              | Autenticado      | Retira um equipamento disponível (cria um empréstimo)  |
| `PATCH` | `/loans/:id/return`   | Autenticado (dono ou `ADMIN`) | Devolve um empréstimo                    |
| `GET`   | `/loans/my`           | Autenticado      | Lista os empréstimos do usuário autenticado            |

### Regra central

Um equipamento inativo ou já emprestado não pode ser retirado (`409 Conflict`). Um empréstimo não pode ser devolvido duas vezes (`409 Conflict`). Apenas o dono do empréstimo (ou um `ADMIN`) pode devolvê-lo (`403 Forbidden`).

### Formato padrão de erro

Todas as respostas de erro (qualquer status 4xx) seguem o mesmo formato:

```json
{
  "statusCode": 404,
  "erro": "Nao encontrado",
  "mensagem": "Equipamento nao encontrado.",
  "caminho": "/loans",
  "timestamp": "2026-09-17T14:38:11.697Z"
}
```

`mensagem` é uma string para a maioria dos erros, e um array de strings especificamente no `400` (uma entrada por campo inválido).

### Detalhes por rota

#### `POST /auth/register`

Cria um usuário. `role` é opcional (padrão `USER`).

**Body**

```json
{
  "nome": "Maria Silva",
  "email": "maria.silva@empresa.com",
  "senha": "senha123",
  "role": "ADMIN"
}
```

| Status | Situação | Corpo da resposta |
| --- | --- | --- |
| `201` | Usuário criado | `{ "id": 1, "nome": "Maria Silva", "email": "maria.silva@empresa.com", "role": "ADMIN", "criadoEm": "2026-09-17T13:13:28.610Z" }` |
| `400` | Campo inválido/ausente | `{ "statusCode": 400, "erro": "Requisicao invalida", "mensagem": ["Informe um e-mail valido.", "A senha deve ter pelo menos 6 caracteres."], "caminho": "/auth/register", "timestamp": "..." }` |
| `409` | E-mail já cadastrado | `{ "statusCode": 409, "erro": "Conflito", "mensagem": "Já existe um usuário com esse e-mail.", "caminho": "/auth/register", "timestamp": "..." }` |

#### `POST /auth/login`

**Body**

```json
{
  "email": "maria.silva@empresa.com",
  "senha": "senha123"
}
```

| Status | Situação | Corpo da resposta |
| --- | --- | --- |
| `200` | Credenciais válidas | `{ "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }` |
| `400` | Campo inválido/ausente | `{ "statusCode": 400, "erro": "Requisicao invalida", "mensagem": ["Informe um e-mail valido."], "caminho": "/auth/login", "timestamp": "..." }` |
| `401` | E-mail ou senha incorretos | `{ "statusCode": 401, "erro": "Nao autenticado", "mensagem": "Credenciais invalidas.", "caminho": "/auth/login", "timestamp": "..." }` |
| `429` | Mais de 5 tentativas em 1 minuto (mesmo IP) | `{ "statusCode": 429, "erro": "Muitas requisicoes", "mensagem": "Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.", "caminho": "/auth/login", "timestamp": "..." }` |

#### `POST /equipment` — requer `ADMIN`

**Body**

```json
{
  "nome": "Notebook Dell Latitude 5440",
  "descricao": "Notebook i5, 16GB RAM, para uso em campo"
}
```

| Status | Situação | Corpo da resposta |
| --- | --- | --- |
| `201` | Equipamento criado | `{ "id": 1, "nome": "Notebook Dell Latitude 5440", "descricao": "Notebook i5, 16GB RAM, para uso em campo", "ativo": true, "emprestado": false, "criadoEm": "..." }` |
| `400` | Campo inválido/ausente | `{ "statusCode": 400, "erro": "Requisicao invalida", "mensagem": ["O nome do equipamento deve ser um texto."], "caminho": "/equipment", "timestamp": "..." }` |
| `401` | Sem token / token inválido | `{ "statusCode": 401, "erro": "Nao autenticado", "mensagem": "Token de autenticacao ausente, invalido ou expirado.", "caminho": "/equipment", "timestamp": "..." }` |
| `403` | Autenticado, mas não é `ADMIN` | `{ "statusCode": 403, "erro": "Sem permissao", "mensagem": "Voce nao tem permissao para acessar este recurso.", "caminho": "/equipment", "timestamp": "..." }` |

#### `GET /equipment` — qualquer usuário autenticado

Paginação opcional via query string (`?page=1&limit=10`). Sem parâmetros, retorna a lista completa.

| Status | Situação | Corpo da resposta |
| --- | --- | --- |
| `200` | Lista retornada | `[ { "id": 1, "nome": "Notebook Dell Latitude 5440", "descricao": "...", "ativo": true, "emprestado": false, "criadoEm": "..." } ]` |
| `401` | Sem token / token inválido | `{ "statusCode": 401, "erro": "Nao autenticado", "mensagem": "Token de autenticacao ausente, invalido ou expirado.", "caminho": "/equipment", "timestamp": "..." }` |

#### `POST /loans` — qualquer usuário autenticado

**Body**

```json
{
  "equipamentoId": 1
}
```

| Status | Situação | Corpo da resposta |
| --- | --- | --- |
| `201` | Empréstimo criado | `{ "id": 1, "usuarioId": 2, "equipamentoId": 1, "status": "ATIVO", "dataRetirada": "...", "dataDevolucao": null }` |
| `400` | `equipamentoId` inválido/ausente | `{ "statusCode": 400, "erro": "Requisicao invalida", "mensagem": ["O equipamentoId deve ser um numero inteiro."], "caminho": "/loans", "timestamp": "..." }` |
| `401` | Sem token / token inválido | `{ "statusCode": 401, "erro": "Nao autenticado", "mensagem": "Token de autenticacao ausente, invalido ou expirado.", "caminho": "/loans", "timestamp": "..." }` |
| `404` | Equipamento não existe | `{ "statusCode": 404, "erro": "Nao encontrado", "mensagem": "Equipamento nao encontrado.", "caminho": "/loans", "timestamp": "..." }` |
| `409` | Equipamento inativo ou já emprestado | `{ "statusCode": 409, "erro": "Conflito", "mensagem": "Equipamento inativo ou ja emprestado nao pode ser retirado.", "caminho": "/loans", "timestamp": "..." }` |

#### `PATCH /loans/:id/return` — dono do empréstimo ou `ADMIN`

Sem body.

| Status | Situação | Corpo da resposta |
| --- | --- | --- |
| `200` | Devolução registrada | `{ "id": 1, "usuarioId": 2, "equipamentoId": 1, "status": "DEVOLVIDO", "dataRetirada": "...", "dataDevolucao": "..." }` |
| `401` | Sem token / token inválido | `{ "statusCode": 401, "erro": "Nao autenticado", "mensagem": "Token de autenticacao ausente, invalido ou expirado.", "caminho": "/loans/1/return", "timestamp": "..." }` |
| `403` | Empréstimo não é do usuário autenticado (e ele não é `ADMIN`) | `{ "statusCode": 403, "erro": "Sem permissao", "mensagem": "Voce so pode devolver seus proprios emprestimos.", "caminho": "/loans/1/return", "timestamp": "..." }` |
| `404` | Empréstimo não existe | `{ "statusCode": 404, "erro": "Nao encontrado", "mensagem": "Emprestimo nao encontrado.", "caminho": "/loans/1/return", "timestamp": "..." }` |
| `409` | Empréstimo já foi devolvido | `{ "statusCode": 409, "erro": "Conflito", "mensagem": "Este emprestimo ja foi devolvido.", "caminho": "/loans/1/return", "timestamp": "..." }` |

#### `GET /loans/my` — qualquer usuário autenticado

Paginação opcional via query string (`?page=1&limit=10`). Sem parâmetros, retorna a lista completa.

| Status | Situação | Corpo da resposta |
| --- | --- | --- |
| `200` | Lista retornada (só os empréstimos do usuário logado) | `[ { "id": 1, "usuarioId": 2, "equipamentoId": 1, "status": "DEVOLVIDO", "dataRetirada": "...", "dataDevolucao": "..." } ]` |
| `401` | Sem token / token inválido | `{ "statusCode": 401, "erro": "Nao autenticado", "mensagem": "Token de autenticacao ausente, invalido ou expirado.", "caminho": "/loans/my", "timestamp": "..." }` |

## Estrutura do projeto

```
src/
├── auth/          # registro, login, estrategia e guards de JWT
├── common/        # guards, decorators, filtro de erro e utils compartilhados
├── equipamento/   # cadastro e listagem de equipamentos
├── emprestimo/    # retirada, devolucao e listagem de emprestimos
└── prisma/        # PrismaService (client + driver adapter)

prisma/
├── schema.prisma  # modelos Usuario, Equipamento, Emprestimo
├── migrations/    # historico de migrations
└── seed.ts        # cria o usuario ADMIN inicial
```
