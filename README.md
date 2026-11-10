# Conectus — Backend

API do Conectus (triagem automática de membros para células, com assinatura SaaS via Mercado Pago).
NestJS 11 · Prisma 7 · PostgreSQL · JWT.

## Rodando localmente
```bash
cp .env.example .env     # preencha DATABASE_URL e JWT_SECRET (o resto é opcional para começar)
docker compose up -d     # Postgres (ou aponte DATABASE_URL para um banco seu)
npm install
npm run db:migrate       # cria as tabelas
npm run db:generate      # gera o cliente do Prisma (pasta generated/)
npm run db:seed          # opcional: igreja demo (senha demo1234)
npm run start:dev        # http://localhost:3333/api
```
Teste rápido: `GET http://localhost:3333/api/planos` deve listar 3 planos.

Logins do seed (senha `demo1234`): `admin@demo.com`, `voluntario@demo.com`, `lider1@demo.com`, `lider2@demo.com`.

## Documentação
- **`docs/BACKEND.md`** — mudanças no banco, regras de negócio, todos os endpoints, Mercado Pago e avisos para o front.
- **`docs/testes.http`** — roteiro de testes clicável (extensão REST Client do VS Code).
- **`docs/TESTANDO_NO_TERMINAL.md`** — o mesmo roteiro com HTTPie.
- **`docs/CONFIGURACAO_EXTERNA.md`** — Mercado Pago (sandbox, webhook/ngrok) e e-mail (SMTP).

## Testes automáticos
```bash
npm run test       # algoritmo de matching (unitário)
npm run test:e2e   # 63 cenários ponta a ponta — usa um banco SEPARADO (conectus_test) que é APAGADO a cada execução
```

## Para o front
Base da API: `http://localhost:3333/api`. Defina `CORS_ORIGIN` no `.env` com o endereço do front (Vite: `http://localhost:5173`).
Erros vêm como `{ message, codigo?, campos? }`. Trate especialmente `403 ASSINATURA_BLOQUEADA` e `403 LIMITE_PLANO` (veja `docs/BACKEND.md`, seção 6).
