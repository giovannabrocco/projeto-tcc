-- Conectus v2: SaaS multitenant + assinatura (Mercado Pago)
-- ATENÇÃO: esta migration RECRIA todas as tabelas (o modelo antigo não tinha id_igreja em
-- usuário, telefone cabia em INT, histórico sem id_membro etc.). Dados de DESENVOLVIMENTO
-- serão perdidos. Não rode em produção com dados reais sem migrar antes.

DROP TABLE IF EXISTS "_AssinaturaToPlano", "tb_feedback", "tb_log_triagem", "tb_lista_espera", "tb_disponibilidade_membro",
  "tb_historico_celulas", "tb_desconto", "tb_promocao", "tb_fatura", "tb_assinatura", "tb_plano",
  "tb_membro", "tb_celula", "tb_igreja", "tb_usuario" CASCADE;

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMINISTRADOR', 'LIDER', 'VOLUNTARIO');

-- CreateEnum
CREATE TYPE "StatusMembro" AS ENUM ('AGUARDANDO_TRIAGEM', 'ALOCADO', 'LISTA_ESPERA', 'DESLIGADO');

-- CreateEnum
CREATE TYPE "StatusTriagem" AS ENUM ('SUGERIDA', 'APROVADA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "StatusEspera" AS ENUM ('AGUARDANDO', 'RESOLVIDO');

-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('TESTE', 'ATIVA', 'ATRASADA', 'CANCELADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "StatusFatura" AS ENUM ('PENDENTE', 'PAGA', 'RECUSADA', 'ESTORNADA');

-- CreateTable
CREATE TABLE "tb_igreja" (
    "id_igreja" SERIAL NOT NULL,
    "nome_igreja" TEXT NOT NULL,
    "denominacao" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "id_central" INTEGER,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_igreja_pkey" PRIMARY KEY ("id_igreja")
);

-- CreateTable
CREATE TABLE "tb_usuario" (
    "id_usuario" SERIAL NOT NULL,
    "id_igreja" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL DEFAULT '',
    "senha" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "senha_temporaria" BOOLEAN NOT NULL DEFAULT false,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "tb_token_senha" (
    "id_token" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_token_senha_pkey" PRIMARY KEY ("id_token")
);

-- CreateTable
CREATE TABLE "tb_celula" (
    "id_celula" SERIAL NOT NULL,
    "id_igreja" INTEGER NOT NULL,
    "id_lider" INTEGER NOT NULL,
    "nome_celula" TEXT NOT NULL,
    "capacidade_maxima" INTEGER NOT NULL,
    "capacidade_atual" INTEGER NOT NULL DEFAULT 0,
    "hora_celula" TEXT NOT NULL,
    "dia_semana" TEXT NOT NULL,
    "perfil_grupo" TEXT NOT NULL,
    "faixa_etaria_min" INTEGER NOT NULL,
    "faixa_etaria_max" INTEGER NOT NULL,
    "cep" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "endereco" TEXT NOT NULL DEFAULT '',
    "descricao" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_celula_pkey" PRIMARY KEY ("id_celula")
);

-- CreateTable
CREATE TABLE "tb_membro" (
    "id_membro" SERIAL NOT NULL,
    "id_igreja" INTEGER NOT NULL,
    "id_celula_alocada" INTEGER,
    "id_usuario_triagem" INTEGER,
    "nome_completo" TEXT NOT NULL,
    "email" TEXT,
    "data_nascimento" DATE NOT NULL,
    "genero" TEXT NOT NULL,
    "estado_civil" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "bairro_membro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "latitude_membro" DOUBLE PRECISION,
    "longitude_membro" DOUBLE PRECISION,
    "perfil_interesse" TEXT NOT NULL DEFAULT '',
    "indicado_por" INTEGER,
    "observacoes" TEXT NOT NULL DEFAULT '',
    "status_membro" "StatusMembro" NOT NULL DEFAULT 'AGUARDANDO_TRIAGEM',
    "indlgpd" BOOLEAN NOT NULL DEFAULT false,
    "dtahora_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_membro_pkey" PRIMARY KEY ("id_membro")
);

-- CreateTable
CREATE TABLE "tb_disponibilidade_membro" (
    "id_disponibilidade" SERIAL NOT NULL,
    "id_membro" INTEGER NOT NULL,
    "dia_semana" TEXT NOT NULL,
    "hora_inicio" TEXT NOT NULL DEFAULT '',
    "hora_fim" TEXT NOT NULL DEFAULT '',
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_disponibilidade_membro_pkey" PRIMARY KEY ("id_disponibilidade")
);

-- CreateTable
CREATE TABLE "tb_historico_celulas" (
    "id_historico" SERIAL NOT NULL,
    "id_membro" INTEGER NOT NULL,
    "id_celula" INTEGER NOT NULL,
    "dta_entrada" DATE NOT NULL,
    "dta_saida" DATE,
    "motivo_saida" TEXT,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_historico_celulas_pkey" PRIMARY KEY ("id_historico")
);

-- CreateTable
CREATE TABLE "tb_log_triagem" (
    "id_log" SERIAL NOT NULL,
    "id_membro" INTEGER NOT NULL,
    "id_celula_sugerida" INTEGER NOT NULL,
    "id_voluntario" INTEGER NOT NULL,
    "score_matching" DOUBLE PRECISION,
    "criterios_score" JSONB,
    "status_triagem" "StatusTriagem" NOT NULL DEFAULT 'SUGERIDA',
    "id_resp_decisao" INTEGER,
    "motivo_rejeicao" TEXT,
    "dtahora_triagem" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_log_triagem_pkey" PRIMARY KEY ("id_log")
);

-- CreateTable
CREATE TABLE "tb_lista_espera" (
    "id_espera" SERIAL NOT NULL,
    "id_membro" INTEGER NOT NULL,
    "data_entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusEspera" NOT NULL DEFAULT 'AGUARDANDO',
    "motivo" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 1,
    "dtaresolucao" TIMESTAMP(3),
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_lista_espera_pkey" PRIMARY KEY ("id_espera")
);

-- CreateTable
CREATE TABLE "tb_feedback" (
    "id_feedback" SERIAL NOT NULL,
    "id_membro" INTEGER NOT NULL,
    "id_log_triagem" INTEGER,
    "status_adaptacao" TEXT NOT NULL,
    "nota_integracao" INTEGER,
    "permaneceu_na_celula" BOOLEAN NOT NULL DEFAULT true,
    "dta_visita" DATE,
    "dta_proximo_contato" DATE,
    "comentarios_membro" TEXT NOT NULL DEFAULT '',
    "avaliacao_lider" TEXT NOT NULL DEFAULT '',
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_feedback_pkey" PRIMARY KEY ("id_feedback")
);

-- CreateTable
CREATE TABLE "tb_notificacao_lida" (
    "id_notificacao_lida" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "chave" TEXT NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_notificacao_lida_pkey" PRIMARY KEY ("id_notificacao_lida")
);

-- CreateTable
CREATE TABLE "tb_plano" (
    "id_plano" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "valor" DECIMAL(10,2) NOT NULL,
    "limite_membros" INTEGER,
    "limite_celulas" INTEGER,
    "limite_usuarios" INTEGER,
    "historico_meses" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_plano_pkey" PRIMARY KEY ("id_plano")
);

-- CreateTable
CREATE TABLE "tb_assinatura" (
    "id_assinatura" SERIAL NOT NULL,
    "id_igreja" INTEGER NOT NULL,
    "id_plano" TEXT NOT NULL,
    "id_plano_pendente" TEXT,
    "status" "StatusAssinatura" NOT NULL DEFAULT 'TESTE',
    "dta_inicio_teste" TIMESTAMP(3),
    "dta_fim_teste" TIMESTAMP(3),
    "dtavencimento" TIMESTAMP(3),
    "dtaultpagamento" TIMESTAMP(3),
    "dta_cancelamento" TIMESTAMP(3),
    "mp_preapproval_id" TEXT,
    "mp_status" TEXT,
    "email_pagador" TEXT,
    "valor_cobrado" DECIMAL(10,2),
    "indpossuidesconto" BOOLEAN NOT NULL DEFAULT false,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_assinatura_pkey" PRIMARY KEY ("id_assinatura")
);

-- CreateTable
CREATE TABLE "tb_fatura" (
    "id_fatura" SERIAL NOT NULL,
    "id_assinatura" INTEGER NOT NULL,
    "id_plano" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "dta_vencimento" TIMESTAMP(3) NOT NULL,
    "dtahor_pagamento" TIMESTAMP(3),
    "vlrtotal" DECIMAL(10,2) NOT NULL,
    "vlrapagar" DECIMAL(10,2) NOT NULL,
    "status" "StatusFatura" NOT NULL DEFAULT 'PENDENTE',
    "motivo_recusa" TEXT,
    "mp_authorized_payment_id" TEXT,
    "mp_payment_id" TEXT,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_fatura_pkey" PRIMARY KEY ("id_fatura")
);

-- CreateTable
CREATE TABLE "tb_promocao" (
    "id_promocao" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "perc_desconto" DOUBLE PRECISION NOT NULL,
    "dtainicio" TIMESTAMP(3) NOT NULL,
    "dtaexpiracao" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "max_usos" INTEGER,
    "total_usos" INTEGER NOT NULL DEFAULT 0,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_promocao_pkey" PRIMARY KEY ("id_promocao")
);

-- CreateTable
CREATE TABLE "tb_desconto" (
    "id_desconto" SERIAL NOT NULL,
    "id_assinatura" INTEGER NOT NULL,
    "id_promocao" INTEGER NOT NULL,
    "perc_aplicado" DOUBLE PRECISION NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_desconto_pkey" PRIMARY KEY ("id_desconto")
);

-- CreateTable
CREATE TABLE "tb_evento_pagamento" (
    "id_evento" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "mp_id" TEXT NOT NULL,
    "acao" TEXT,
    "payload" JSONB NOT NULL,
    "processado_em" TIMESTAMP(3),
    "erro" TEXT,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_evento_pagamento_pkey" PRIMARY KEY ("id_evento")
);

-- CreateIndex
CREATE UNIQUE INDEX "tb_usuario_email_key" ON "tb_usuario"("email");

-- CreateIndex
CREATE INDEX "tb_usuario_id_igreja_idx" ON "tb_usuario"("id_igreja");

-- CreateIndex
CREATE UNIQUE INDEX "tb_token_senha_token_hash_key" ON "tb_token_senha"("token_hash");

-- CreateIndex
CREATE INDEX "tb_celula_id_igreja_ativa_idx" ON "tb_celula"("id_igreja", "ativa");

-- CreateIndex
CREATE INDEX "tb_celula_id_lider_idx" ON "tb_celula"("id_lider");

-- CreateIndex
CREATE UNIQUE INDEX "tb_membro_id_igreja_email_key" ON "tb_membro"("id_igreja", "email");

-- CreateIndex
CREATE INDEX "tb_membro_id_igreja_status_membro_idx" ON "tb_membro"("id_igreja", "status_membro");

-- CreateIndex
CREATE INDEX "tb_membro_id_celula_alocada_idx" ON "tb_membro"("id_celula_alocada");

-- CreateIndex
CREATE INDEX "tb_disponibilidade_membro_id_membro_idx" ON "tb_disponibilidade_membro"("id_membro");

-- CreateIndex
CREATE INDEX "tb_historico_celulas_id_membro_idx" ON "tb_historico_celulas"("id_membro");

-- CreateIndex
CREATE INDEX "tb_historico_celulas_id_celula_idx" ON "tb_historico_celulas"("id_celula");

-- CreateIndex
CREATE INDEX "tb_log_triagem_id_membro_idx" ON "tb_log_triagem"("id_membro");

-- CreateIndex
CREATE INDEX "tb_lista_espera_id_membro_status_idx" ON "tb_lista_espera"("id_membro", "status");

-- CreateIndex
CREATE INDEX "tb_feedback_id_membro_idx" ON "tb_feedback"("id_membro");

-- CreateIndex
CREATE UNIQUE INDEX "tb_notificacao_lida_id_usuario_chave_key" ON "tb_notificacao_lida"("id_usuario", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "tb_assinatura_id_igreja_key" ON "tb_assinatura"("id_igreja");

-- CreateIndex
CREATE UNIQUE INDEX "tb_assinatura_mp_preapproval_id_key" ON "tb_assinatura"("mp_preapproval_id");

-- CreateIndex
CREATE UNIQUE INDEX "tb_fatura_mp_authorized_payment_id_key" ON "tb_fatura"("mp_authorized_payment_id");

-- CreateIndex
CREATE INDEX "tb_fatura_id_assinatura_idx" ON "tb_fatura"("id_assinatura");

-- CreateIndex
CREATE UNIQUE INDEX "tb_promocao_codigo_key" ON "tb_promocao"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tb_desconto_id_assinatura_id_promocao_key" ON "tb_desconto"("id_assinatura", "id_promocao");

-- CreateIndex
CREATE INDEX "tb_evento_pagamento_tipo_mp_id_idx" ON "tb_evento_pagamento"("tipo", "mp_id");

-- AddForeignKey
ALTER TABLE "tb_igreja" ADD CONSTRAINT "tb_igreja_id_central_fkey" FOREIGN KEY ("id_central") REFERENCES "tb_igreja"("id_igreja") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_usuario" ADD CONSTRAINT "tb_usuario_id_igreja_fkey" FOREIGN KEY ("id_igreja") REFERENCES "tb_igreja"("id_igreja") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_token_senha" ADD CONSTRAINT "tb_token_senha_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "tb_usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_celula" ADD CONSTRAINT "tb_celula_id_igreja_fkey" FOREIGN KEY ("id_igreja") REFERENCES "tb_igreja"("id_igreja") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_celula" ADD CONSTRAINT "tb_celula_id_lider_fkey" FOREIGN KEY ("id_lider") REFERENCES "tb_usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_membro" ADD CONSTRAINT "tb_membro_id_igreja_fkey" FOREIGN KEY ("id_igreja") REFERENCES "tb_igreja"("id_igreja") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_membro" ADD CONSTRAINT "tb_membro_id_celula_alocada_fkey" FOREIGN KEY ("id_celula_alocada") REFERENCES "tb_celula"("id_celula") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_membro" ADD CONSTRAINT "tb_membro_id_usuario_triagem_fkey" FOREIGN KEY ("id_usuario_triagem") REFERENCES "tb_usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_membro" ADD CONSTRAINT "tb_membro_indicado_por_fkey" FOREIGN KEY ("indicado_por") REFERENCES "tb_membro"("id_membro") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_disponibilidade_membro" ADD CONSTRAINT "tb_disponibilidade_membro_id_membro_fkey" FOREIGN KEY ("id_membro") REFERENCES "tb_membro"("id_membro") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_historico_celulas" ADD CONSTRAINT "tb_historico_celulas_id_membro_fkey" FOREIGN KEY ("id_membro") REFERENCES "tb_membro"("id_membro") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_historico_celulas" ADD CONSTRAINT "tb_historico_celulas_id_celula_fkey" FOREIGN KEY ("id_celula") REFERENCES "tb_celula"("id_celula") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_log_triagem" ADD CONSTRAINT "tb_log_triagem_id_membro_fkey" FOREIGN KEY ("id_membro") REFERENCES "tb_membro"("id_membro") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_log_triagem" ADD CONSTRAINT "tb_log_triagem_id_celula_sugerida_fkey" FOREIGN KEY ("id_celula_sugerida") REFERENCES "tb_celula"("id_celula") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_log_triagem" ADD CONSTRAINT "tb_log_triagem_id_voluntario_fkey" FOREIGN KEY ("id_voluntario") REFERENCES "tb_usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_log_triagem" ADD CONSTRAINT "tb_log_triagem_id_resp_decisao_fkey" FOREIGN KEY ("id_resp_decisao") REFERENCES "tb_usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_lista_espera" ADD CONSTRAINT "tb_lista_espera_id_membro_fkey" FOREIGN KEY ("id_membro") REFERENCES "tb_membro"("id_membro") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_feedback" ADD CONSTRAINT "tb_feedback_id_membro_fkey" FOREIGN KEY ("id_membro") REFERENCES "tb_membro"("id_membro") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_feedback" ADD CONSTRAINT "tb_feedback_id_log_triagem_fkey" FOREIGN KEY ("id_log_triagem") REFERENCES "tb_log_triagem"("id_log") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_notificacao_lida" ADD CONSTRAINT "tb_notificacao_lida_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "tb_usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_assinatura" ADD CONSTRAINT "tb_assinatura_id_igreja_fkey" FOREIGN KEY ("id_igreja") REFERENCES "tb_igreja"("id_igreja") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_assinatura" ADD CONSTRAINT "tb_assinatura_id_plano_fkey" FOREIGN KEY ("id_plano") REFERENCES "tb_plano"("id_plano") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_assinatura" ADD CONSTRAINT "tb_assinatura_id_plano_pendente_fkey" FOREIGN KEY ("id_plano_pendente") REFERENCES "tb_plano"("id_plano") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_fatura" ADD CONSTRAINT "tb_fatura_id_assinatura_fkey" FOREIGN KEY ("id_assinatura") REFERENCES "tb_assinatura"("id_assinatura") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_fatura" ADD CONSTRAINT "tb_fatura_id_plano_fkey" FOREIGN KEY ("id_plano") REFERENCES "tb_plano"("id_plano") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_desconto" ADD CONSTRAINT "tb_desconto_id_promocao_fkey" FOREIGN KEY ("id_promocao") REFERENCES "tb_promocao"("id_promocao") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_desconto" ADD CONSTRAINT "tb_desconto_id_assinatura_fkey" FOREIGN KEY ("id_assinatura") REFERENCES "tb_assinatura"("id_assinatura") ON DELETE RESTRICT ON UPDATE CASCADE;

