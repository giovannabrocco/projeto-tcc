# Configuração de serviços externos

## 1. E-mail (SMTP)
Sem SMTP o conteúdo dos e-mails (inclusive o link de "esqueci a senha") aparece só no terminal da API. Para enviar de verdade:

### Opção A — Mailtrap (caixa de teste; nada sai para a internet, ideal para o TCC)
1. Crie uma conta gratuita em https://mailtrap.io.
2. Entre em **Email Testing > Inboxes** (caixa de teste) e abra a inbox. Procure **SMTP Settings**.
3. Copie host, porta, usuário e senha para o `.env`:
   ```
   SMTP_HOST=sandbox.smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=usuario-mostrado-no-mailtrap
   SMTP_PASS=senha-mostrada-no-mailtrap
   SMTP_FROM="Conectus <nao-responda@conectus.app>"
   ```
4. Reinicie a API. Os e-mails passam a aparecer na inbox do Mailtrap.

### Opção B — Gmail (e-mail de verdade)
1. Na conta Google: ative a **verificação em duas etapas** e crie uma **senha de app** (Conta Google > Segurança > Senhas de app).
2. No `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seu-email@gmail.com
   SMTP_PASS=senha-de-app-de-16-letras
   SMTP_FROM="Conectus <seu-email@gmail.com>"
   ```
3. Reinicie a API.

### Testar
- `POST /api/auth/esqueci-senha` com o e-mail de um usuário existente. O e-mail chega com um link `FRONTEND_URL/redefinir-senha?token=...`.
- O token vale 1 hora e só pode ser usado uma vez (`POST /api/auth/redefinir-senha`).
- `FRONTEND_URL` no `.env` precisa ser o endereço real do front, senão o link do e-mail não abre a tela certa.

## 2. Mercado Pago (sandbox)
- Use o **Access Token do vendedor de teste** em `MP_ACCESS_TOKEN`.
- `emailPagador` do checkout = e-mail do **comprador de teste**: `test_user_<número depois de TESTUSER>@testuser.com` (não é o User ID). Usar o e-mail do vendedor ou um formato errado dá `User bad request`.
- Webhook: URL pública (ngrok) `https://SEU-ENDERECO/api/pagamentos/webhook`, evento "Planos e assinaturas". Copie a assinatura secreta para `MP_WEBHOOK_SECRET`.
- `MP_NOTIFICATION_URL` e `MP_BACK_URL` no `.env` devem usar o mesmo endereço do ngrok (que muda se o ngrok for reiniciado).
- Em produção, troque para as credenciais de produção, `MP_BACK_URL` para a tela de retorno do front e `MP_NOTIFICATION_URL` para o domínio público da API.
