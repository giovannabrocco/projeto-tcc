# Conectus — Backend: o que foi feito, o que mudou no banco e como usar

> Stack: NestJS 11 + Prisma 7 + PostgreSQL. Prefixo da API: `/api` (porta 3333).
> Erros seguem o contrato do front: `{ message, codigo?, campos? }`.

## 1. Como rodar

```bash
cp .env.example .env            # preencha DATABASE_URL e JWT_SECRET
docker compose up -d            # Postgres (docker-compose.yml)
npm install
npm run db:migrate              # npx prisma migrate deploy  (veja o aviso da seção 2!)
npm run db:generate             # gera generated/prisma
npm run db:seed                 # opcional: igreja demo (admin@demo.com / demo1234)
npm run start:dev
npm run test                    # 13 testes unitários (algoritmo de matching)
npm run test:e2e                # 62 testes de ponta a ponta (usa um banco de teste)
```

Para o e2e crie um banco vazio `conectus_test`, rode `DATABASE_URL=...conectus_test npm run db:migrate` e depois
`DATABASE_URL=... npm run test:e2e` (o teste faz TRUNCATE nas tabelas — **nunca aponte para um banco com dados reais**).

## 2. Mudanças no banco (IMPORTANTE)

A migration `20261109120000_saas_v2` **apaga e recria todas as tabelas**. Foi a forma mais segura porque o modelo
antigo tinha problemas estruturais. **Todos os dados atuais serão perdidos** (ok em desenvolvimento/TCC; em produção
precisaria de migração de dados). Em máquina limpa: `npx prisma migrate reset` ou `migrate deploy`.

> Não consegui rodar o `prisma migrate` no meu ambiente (sem acesso ao download do engine), então gerei o SQL
> por script e o apliquei/validei direto no Postgres 16. Se na sua máquina o Prisma reclamar de divergência,
> use `npx prisma migrate reset` (dev) e, se quiser, `npx prisma migrate dev --name ajustes` para ver o diff.

### Problemas do modelo antigo corrigidos
| Problema | Correção |
|---|---|
| `telefone` era `Int` (não cabe "(11) 91234-5678" nem DDD+9 dígitos) | `String` em membro, usuário e igreja |
| Usuário sem `id_igreja` → impossível isolar dados entre igrejas (RF05) | `id_igreja` em usuário, célula, membro, etc. Todo acesso filtra pela igreja do token |
| Plano era "fatura Pix" e `id_plano` Int | `tb_plano` com id textual (ESSENCIAL/INTERMEDIARIO/PREMIUM) e limites |
| Histórico de célula sem saber *quem* | `id_membro`, `dta_entrada`, `dta_saida`, `motivo_saida` |
| Sem controle de desativação | `ativo` (usuário/igreja) e `ativa` (célula) |

### Tabelas (todas `tb_*`)
- **Núcleo**: `tb_igreja` (+`id_central` opcional p/ filiais), `tb_usuario` (+`perfil`, `ativo`, `senha_temporaria`),
  `tb_token_senha` (recuperação de senha, guarda só o hash), `tb_celula` (+lat/long, faixa etária min/max, `ativa`),
  `tb_membro` (+lat/long, `perfil_interesse`, `indicado_por`, `indlgpd`, e-mail único por igreja),
  `tb_disponibilidade_membro`, `tb_historico_celulas`.
- **Triagem**: `tb_log_triagem` (critérios do score em JSON, voluntário, status SUGERIDA/APROVADA/REJEITADA, motivo),
  `tb_lista_espera` (`tentativas`), `tb_feedback`, `tb_notificacao_lida` (as notificações são *calculadas* na consulta;
  só guardamos o que cada usuário já dispensou).
- **Cobrança (novo)**: `tb_plano`, `tb_assinatura` (1 por igreja), `tb_fatura` (1 por cobrança recorrente do MP),
  `tb_promocao` (cupom) e `tb_desconto` (cupom usado por assinatura), `tb_evento_pagamento` (auditoria de todo webhook).

Os 3 planos (Essencial R$49 / Intermediário R$99 / Premium R$179, valores do TCC) são gravados automaticamente na
subida da API **sem sobrescrever** o que você alterar depois no banco. `NULL` num limite = ilimitado.

## 3. Regras de negócio implementadas

**Perfis** (RC03): ADMINISTRADOR (tudo), VOLUNTARIO (cadastra membros e faz triagem), LIDER (vê só os membros da
própria célula e registra feedback/saída). Guard global: toda rota exige JWT, salvo as marcadas públicas.

**Multitenância**: o `idIgreja` vem do token, nunca do corpo. Registro de outra igreja responde **404**.

**Matching** (RF03, `src/triagem/matching.ts`, função pura testada): pesos distância 0.40, faixa etária 0.25,
disponibilidade 0.20, perfil do grupo 0.15; Haversine; regras eliminatórias (célula lotada/inativa, gênero incompatível em
células exclusivas, etc.); desempate por mais vagas e menor distância; retorna até 3 sugestões, mínimo 65. Membro
sem coordenadas pontua 0 em distância. Cada sugestão gera um `Log_Triagem` com os critérios.

**Alocação** (RC06): transacional e à prova de concorrência — o membro é "reivindicado" por `updateMany` e a vaga
por `UPDATE ... SET capacidade_atual+1 WHERE capacidade_atual < capacidade_maxima`. Dois voluntários disputando a
última vaga: um recebe 200, o outro 409 `CELULA_LOTADA` (testado). Saída/desativação devolve a vaga e abre/fecha o histórico.

**Assinatura — máquina de estados** (`src/assinatura/situacao.ts`):
| Status | Quando | Acesso |
|---|---|---|
| TESTE | cadastro novo, `TRIAL_DIAS` (7) | liberado até `dta_fim_teste` |
| ATIVA | MP autorizou e cobra | liberado até `dtavencimento` |
| ATRASADA | cobrança recusada | liberado por `CARENCIA_DIAS` (5) após o vencimento |
| CANCELADA | admin cancelou | liberado até o fim do período já pago |
| EXPIRADA | teste acabou / carência passou / cancelada vencida | **bloqueado** |

**Bloqueio = modo somente leitura**: GET continua funcionando (a igreja não perde acesso aos próprios dados);
qualquer escrita devolve **403 `codigo: ASSINATURA_BLOQUEADA`**. As rotas de cobrança (`/assinatura/*`) nunca são
bloqueadas, para o cliente conseguir regularizar. Se atingir o limite do plano: **403 `LIMITE_PLANO`** ao criar
membro/célula/usuário.

**Troca de plano**: durante o TESTE vale na hora. Upgrade pago vale na hora (limites maiores imediatamente) e o novo
valor é cobrado a partir do próximo ciclo (sem *pró-rata*). Downgrade é **agendado** para o fim do período pago
(`id_plano_pendente`) e recusado com 409 `USO_EXCEDE_PLANO` se o uso atual não couber no plano menor.

**Rotinas agendadas** (`@nestjs/schedule`): de hora em hora aplica downgrades pendentes e persiste transições
(ATRASADA/EXPIRADA); às 09:00 (São Paulo) envia lembretes de teste acabando / pagamento atrasado.

## 4. Mercado Pago (assinatura recorrente — "preapproval")

Fluxo: `POST /assinatura/checkout` → criamos uma assinatura **pendente** no MP e devolvemos `initPoint` → o front
redireciona o cliente → ele paga no MP → o MP chama nosso **webhook** → a igreja vira ATIVA. Na volta do cliente o
front chama `POST /assinatura/sincronizar` (relê o MP; cobre atraso do webhook).

Segurança: o webhook **nunca confia no corpo** — só pega o ID e consulta a API do MP com o nosso token. Também valida
`x-signature` (HMAC) quando `MP_WEBHOOK_SECRET` está definido. Webhooks repetidos são idempotentes (fatura por
`mp_authorized_payment_id` único). Assinaturas duplicadas autorizadas são canceladas automaticamente (evita cobrar em dobro).
A ligação MP↔igreja é o `external_reference = igreja:{id}|plano:{ID}|cupom:{COD}`.

### Configuração
1. https://www.mercadopago.com.br/developers/panel → crie uma aplicação → copie o **Access Token de teste** para `MP_ACCESS_TOKEN`.
2. Em *Webhooks* cadastre `https://SUA-API/api/pagamentos/webhook` com os eventos **Planos e assinaturas** (assinatura e pagamento recorrente) e copie a *assinatura secreta* para `MP_WEBHOOK_SECRET`. Em dev use ngrok/cloudflared e preencha `MP_NOTIFICATION_URL`.
3. Teste com **usuários de teste** do MP (vendedor e comprador). Em sandbox o e-mail do pagador (`emailPagador` no checkout) deve ser o do comprador de teste, no formato `test_user_<NUMERO>@testuser.com`, onde `<NUMERO>` é o que vem depois de `TESTUSER` no nome de usuário do comprador (não é o User ID). Usar o e-mail do vendedor ou um formato errado dá `User bad request` (400). O Access Token deve ser o do vendedor de teste.
4. Cartões de teste: documentação "Cartões de teste" do MP.

> ⚠️ **Não consegui testar contra o sandbox real do Mercado Pago** (sem acesso à rede/credenciais). A integração foi
> validada com um MP simulado (`test/fakes.ts`) seguindo a documentação de *preapproval*. Faça um teste ponta a ponta
> no sandbox antes de apresentar; se algum campo do MP divergir, o ajuste fica concentrado em
> `src/assinatura/mercadopago.service.ts`.

Observação de negócio: o teste grátis do app **não adia** a primeira cobrança do MP — ao assinar, a cobrança começa
no ato (o teste restante é encerrado). Se quiser "cobrar só após o teste", dá para usar `free_trial` no preapproval.

## 5. Endpoints

Autenticação: `Authorization: Bearer <token>`. 🔓 = público.

**Landing / cadastro**
- 🔓 `GET /planos` — planos, valores, limites e `trialDias` (monte "nossos planos" a partir disso).
- 🔓 `POST /igrejas` — cadastro do assinante: `{ igreja:{nomeIgreja,denominacao,cidade,estado,telefone?,plano}, administrador:{nome,email,senha} }`. Cria igreja + admin + assinatura em teste e **já devolve o token** (cliente entra direto; o pagamento pode ser feito já ou depois).
- 🔓 `GET /assinatura/cupom/:codigo` — valida cupom para mostrar o desconto antes de pagar.
- `POST /assinatura/checkout` `{ plano, cupom?, emailPagador? }` → `{ initPoint, valor, ... }` (admin).

**Auth**: 🔓 `POST /auth/login`, 🔓 `POST /auth/esqueci-senha`, 🔓 `POST /auth/redefinir-senha`, `GET /auth/me`, `POST /auth/alterar-senha`.
(login/me trazem `assinatura` com `liberado`, `status`, `diasRestantes`, `motivoBloqueio` para o front exibir faixa de aviso.)

**Igreja**: `GET/PUT /igrejas/atual`. **Usuários** (admin): `GET/POST /usuarios`, `PUT /usuarios/:id`, `PATCH /usuarios/:id/status`, `POST /usuarios/:id/redefinir-senha`; `GET /lideres`, `GET /lideres/:id`.
**Células**: `GET /celulas` (filtros `comVagas`, `dia`...), `GET/PUT /celulas/:id`, `POST /celulas`, `PATCH /celulas/:id/status` (409 `CONFIRMACAO_NECESSARIA` se tiver membros; reenviar com `confirmar:true` devolve os membros à triagem).
**Membros**: `GET/POST /membros`, `GET/PUT /membros/:id`, `POST /membros/:id/saida`, `POST /membros/:id/desvincular`, `DELETE /membros/:id` (exclusão LGPD, admin).
**Triagem**: `GET /triagem/pendentes`, `POST /triagem/:id/matching`, `POST /triagem/:id/alocacao`, `POST /triagem/:id/rejeicao`, `GET /triagem/:id/logs`.
**Lista de espera**: `GET/POST /lista-espera`, `POST /lista-espera/:id/tentativas`. **Notificações**: `GET /notificacoes`, `PATCH /notificacoes/:id`.
**Feedbacks**: `GET /feedbacks`, `GET /feedbacks/acompanhamento`, `POST /feedbacks`.
**Relatórios** (admin): `resumo` (dashboard, também voluntário), `novos-membros`, `ocupacao`, `distribuicao-geografica` (respeitam o histórico máximo do plano). **Busca**: `GET /busca?q=`.
**Assinatura** (admin, nunca bloqueadas): `GET /assinatura`, `POST /assinatura/checkout|sincronizar|plano|cancelar`; 🔓 `POST /pagamentos/webhook`.
**Plataforma** (header `x-plataforma-key` = `PLATAFORMA_ADMIN_KEY`): `GET /plataforma/igrejas`, `GET/POST /plataforma/promocoes`, `PATCH /plataforma/promocoes/:id`.

## 6. Avisos para quem faz o front
1. Tratar **403 `ASSINATURA_BLOQUEADA`** (mostrar tela/faixa "regularize" com botão para o checkout) e **403 `LIMITE_PLANO`** (oferecer upgrade).
2. Após o redirect de volta do Mercado Pago, chamar `POST /assinatura/sincronizar`.
3. `senhaTemporaria: true` no usuário → forçar troca de senha no primeiro login (`/auth/alterar-senha`).
4. Telefone agora é **texto**.
5. Landing: `GET /planos` + botão "Entrar" (`/auth/login`) + botão "Quero ser assinante" (`POST /igrejas` → `POST /assinatura/checkout` → redirect `initPoint`).

## 7. Extras que fiz além do pedido
Recuperação/alteração de senha por e-mail, reset de senha de usuário pelo admin, exclusão LGPD, cupons de desconto,
painel interno da plataforma, auditoria de webhooks, lembretes por e-mail, rate limit nas rotas de login, helmet/CORS.
Sem `SMTP_HOST` os e-mails só aparecem no log do servidor (útil em dev).

## 8. Pontos essenciais que não estavam mapeados (sugestões)
- **LGPD**: coletar o consentimento (`indlgpd`) no cadastro do membro e ter política de privacidade/termos de uso na landing; já existe a exclusão definitiva.
- **Duplicidade de membro** (mesmo nome+telefone) — hoje só o e-mail é único.
- **Aviso por e-mail ao voluntário** quando abre vaga para quem está na lista de espera (hoje é notificação na tela).
- **Nota fiscal / dados de cobrança** (CNPJ/CPF da igreja) — o MP cobra, mas a emissão de NF é por fora.
- **Login do super-admin real** (hoje é por chave no header) e **backup** automático do banco.
- **Trial por cartão** (`free_trial` do MP) caso queiram só cobrar após o teste.
- **Auditoria** de ações administrativas e **2FA** para o admin, se houver tempo.
