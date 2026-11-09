# Testando a API pelo terminal (HTTPie)

Instalar: `pip install httpie` (ou `brew install httpie` / `choco install httpie`).
Suba a API (`npm run start:dev`) e o banco. Tudo abaixo usa `http://localhost:3333/api`.

```bash
export API=http://localhost:3333/api
```

## 1. Fluxo do assinante (landing → cadastro → pagamento)
```bash
# Planos (público)
http GET $API/planos

# Cadastro: cria igreja + admin + teste grátis e já devolve o token
http POST $API/igrejas \
  igreja:='{"nomeIgreja":"Igreja Teste","denominacao":"Batista","cidade":"Ribeirão Preto","estado":"SP","plano":"INTERMEDIARIO"}' \
  administrador:='{"nome":"Admin Teste","email":"admin@teste.com","senha":"senha-forte-1"}'

# Login -> guarde o token
export TOKEN=$(http --print=b POST $API/auth/login email=admin@teste.com senha=senha-forte-1 | jq -r .token)
# (sem jq: copie o campo "token" da resposta e faça: export TOKEN=cole_aqui)

# Situação da assinatura
http GET $API/assinatura "Authorization:Bearer $TOKEN"

# Checkout Mercado Pago -> devolve initPoint (abra no navegador e pague com usuário de teste do MP)
http POST $API/assinatura/checkout "Authorization:Bearer $TOKEN" plano=INTERMEDIARIO emailPagador=comprador-de-teste@testuser.com

# Depois de pagar (ou se o webhook demorar):
http POST $API/assinatura/sincronizar "Authorization:Bearer $TOKEN"
```
> O webhook só chega no seu PC se a API estiver exposta (ngrok/cloudflared) e `MP_NOTIFICATION_URL` configurada.
> Sem isso, use `/assinatura/sincronizar` depois de pagar: ele consulta o MP direto.

## 2. Operação: usuários, células, membros, triagem
```bash
A="Authorization:Bearer $TOKEN"

# Usuários (admin). Líder precisa existir antes da célula
http POST $API/usuarios $A nome="Pedro Líder" email=pedro@teste.com perfil=LIDER senhaTemporaria=temporaria-1
http POST $API/usuarios $A nome="Carol" email=carol@teste.com perfil=VOLUNTARIO senhaTemporaria=temporaria-1
http GET  $API/lideres $A            # anote o idUsuario do Pedro

# Célula (o CEP é geocodificado sozinho)
http POST $API/celulas $A nomeCelula="Centro - Jovens" idLider:=2 capacidadeMaxima:=15 horario=20:00 \
  diaSemana=QUA perfilGrupo=JOVENS faixaEtaria=18-28 cep=14015-040 bairro=Centro

# Membro (login como voluntária)
export VOL=$(http --print=b POST $API/auth/login email=carol@teste.com senha=temporaria-1 | jq -r .token)
http POST $API/membros "Authorization:Bearer $VOL" nomeCompleto="Mariana Costa" dataNascimento=2002-05-10 \
  genero=F estadoCivil=SOLTEIRO telefone="(16) 99999-1234" cep=14015-040 bairro=Centro perfilInteresse=JOVENS \
  disponibilidades:='[{"diaSemana":"QUA","horarioInicio":"19:00","horarioFim":"22:00"}]'

# Triagem
http GET  $API/triagem/pendentes "Authorization:Bearer $VOL"
http POST $API/triagem/1/matching "Authorization:Bearer $VOL"                     # sugestões com score
http POST $API/triagem/1/alocacao "Authorization:Bearer $VOL" idCelula:=1 modo=AUTOMATICA idLog:=1

# Dashboard e relatórios
http GET $API/relatorios/resumo $A
http GET $API/relatorios/ocupacao $A
```

## 3. Cenários de bloqueio / limites (o que mais vale mostrar na banca)
```bash
# Limite do plano: crie usuários até passar do limite -> 403 codigo=LIMITE_PLANO
# Bloqueio por falta de pagamento: force o vencimento no banco e tente escrever
psql $DATABASE_URL -c "UPDATE tb_assinatura SET status='ATRASADA', dtavencimento=now()-interval '10 days'"
http GET  $API/membros $A                       # leitura continua: 200
http POST $API/celulas $A nomeCelula=x          # escrita: 403 codigo=ASSINATURA_BLOQUEADA
http GET  $API/assinatura $A                    # cobrança continua liberada
```

## 4. Cupom (painel interno)
```bash
http POST $API/plataforma/promocoes x-plataforma-key:$PLATAFORMA_ADMIN_KEY codigo=BEMVINDO20 \
  percDesconto:=20 dtainicio=2026-01-01T00:00:00Z dtaexpiracao=2030-01-01T00:00:00Z maxUsos:=5
http GET $API/assinatura/cupom/BEMVINDO20
```

## 5. Rodar a bateria automática
`npm run test` (matching) e `npm run test:e2e` (62 cenários, usa banco `conectus_test` — será apagado a cada execução).

Dica: o `docs/BACKEND.md` lista todas as rotas e os campos.
