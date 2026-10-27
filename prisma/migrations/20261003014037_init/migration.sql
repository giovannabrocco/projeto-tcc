-- CreateTable
CREATE TABLE "tb_usuario" (
    "id_usuario" SERIAL NOT NULL,
    "tipo_usuario" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "tb_celula" (
    "id_celula" SERIAL NOT NULL,
    "nome_celula" TEXT NOT NULL,
    "capacidade_maxima" INTEGER NOT NULL,
    "capacidade_atual" INTEGER NOT NULL,
    "hora_celula" TEXT NOT NULL,
    "diaSemana" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,
    "perfil_grupo" TEXT NOT NULL,
    "faixa_etaria_min" INTEGER NOT NULL,
    "faixa_etaria_max" INTEGER NOT NULL,
    "cep" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "id_igreja" INTEGER NOT NULL,

    CONSTRAINT "tb_celula_pkey" PRIMARY KEY ("id_celula")
);

-- CreateTable
CREATE TABLE "tb_igreja" (
    "id_igreja" SERIAL NOT NULL,
    "nome_igreja" TEXT NOT NULL,
    "denominacao" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,
    "telefone" TEXT NOT NULL,
    "id_central" INTEGER NOT NULL,

    CONSTRAINT "tb_igreja_pkey" PRIMARY KEY ("id_igreja")
);

-- CreateTable
CREATE TABLE "tb_membro" (
    "id_membro" SERIAL NOT NULL,
    "id_celula_alocada" INTEGER NOT NULL,
    "id_igreja" INTEGER NOT NULL,
    "id_usuario_triagem" INTEGER NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "data_nascimento" TIMESTAMP(3) NOT NULL,
    "genero" TEXT NOT NULL,
    "estado_civil" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "bairro_membro" TEXT NOT NULL,
    "latitude_membro" DOUBLE PRECISION NOT NULL,
    "longitude_membro" DOUBLE PRECISION NOT NULL,
    "telefone" TEXT NOT NULL,
    "indicado_por" TEXT NOT NULL,
    "dtahora_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,
    "indlgpd" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tb_membro_pkey" PRIMARY KEY ("id_membro")
);

-- CreateTable
CREATE TABLE "tb_assinatura" (
    "id_assinatura" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_plano" TEXT NOT NULL,
    "dtavencimento" TIMESTAMP(3) NOT NULL,
    "dtaultpagamento" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,
    "indpossuidesconto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tb_assinatura_pkey" PRIMARY KEY ("id_assinatura")
);

-- CreateTable
CREATE TABLE "tb_promocao" (
    "id_promocao" SERIAL NOT NULL,
    "id_assinatura" INTEGER NOT NULL,
    "dtainicio" TIMESTAMP(3) NOT NULL,
    "dtaexpiracao" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "perc_desconto" DOUBLE PRECISION NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,
    "indpromocao" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "tb_promocao_pkey" PRIMARY KEY ("id_promocao")
);

-- CreateTable
CREATE TABLE "tb_desconto" (
    "id_desconto" SERIAL NOT NULL,
    "id_assinatura" INTEGER NOT NULL,
    "id_promocao" INTEGER NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_desconto_pkey" PRIMARY KEY ("id_desconto")
);

-- CreateTable
CREATE TABLE "tb_fatura" (
    "id_fatura" SERIAL NOT NULL,
    "id_assinatura" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "dta_vencimento" TIMESTAMP(3) NOT NULL,
    "dtahor_pagamento" TIMESTAMP(3) NOT NULL,
    "vlrtotal" DOUBLE PRECISION NOT NULL,
    "vlrapagar" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "tb_fatura_pkey" PRIMARY KEY ("id_fatura")
);

-- CreateTable
CREATE TABLE "tb_plano" (
    "id_plano" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_plano_pkey" PRIMARY KEY ("id_plano")
);

-- CreateTable
CREATE TABLE "tb_lista_espera" (
    "id_espera" SERIAL NOT NULL,
    "id_membro" INTEGER NOT NULL,
    "data_entrada" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "dtaresolucao" TIMESTAMP(3) NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_lista_espera_pkey" PRIMARY KEY ("id_espera")
);

-- CreateTable
CREATE TABLE "tb_disponibilidade_membro" (
    "id_disponibilidade" SERIAL NOT NULL,
    "id_membro" INTEGER NOT NULL,
    "dia_semana" TEXT NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fim" TEXT NOT NULL,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_disponibilidade_membro_pkey" PRIMARY KEY ("id_disponibilidade")
);

-- CreateTable
CREATE TABLE "tb_log_triagem" (
    "id_log" SERIAL NOT NULL,
    "id_membro" INTEGER NOT NULL,
    "id_celula_sugerida" INTEGER NOT NULL,
    "score_matching" DOUBLE PRECISION NOT NULL,
    "criterios_score" TEXT NOT NULL,
    "status_triagem" TEXT NOT NULL,
    "id_resp_decisao" INTEGER NOT NULL,
    "motivo_rejeicao" TEXT NOT NULL,
    "dtahora_triagem" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_log_triagem_pkey" PRIMARY KEY ("id_log")
);

-- CreateTable
CREATE TABLE "tb_feedback" (
    "id_feedback" SERIAL NOT NULL,
    "id_membro" INTEGER NOT NULL,
    "id_log_traigem" INTEGER NOT NULL,
    "status_adaptacao" TEXT NOT NULL,
    "nota_integracao" INTEGER NOT NULL,
    "permaneceu_na_celula" TEXT NOT NULL,
    "dta_visita" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dta_proximo_contato" TIMESTAMP(3) NOT NULL,
    "comentarios_membro" TEXT NOT NULL,
    "avaliacao_lider" TEXT NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_feedback_pkey" PRIMARY KEY ("id_feedback")
);

-- CreateTable
CREATE TABLE "tb_historico_celulas" (
    "id_historico" SERIAL NOT NULL,
    "id_celula" INTEGER NOT NULL,
    "dta_inicio" TIMESTAMP(3) NOT NULL,
    "dta_fim" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "dtahora_criado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dtahora_atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_historico_celulas_pkey" PRIMARY KEY ("id_historico")
);

-- CreateTable
CREATE TABLE "_AssinaturaToPlano" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AssinaturaToPlano_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "tb_usuario_email_key" ON "tb_usuario"("email");

-- CreateIndex
CREATE INDEX "fk_assinatura_usuario" ON "tb_assinatura"("id_usuario");

-- CreateIndex
CREATE INDEX "_AssinaturaToPlano_B_index" ON "_AssinaturaToPlano"("B");

-- AddForeignKey
ALTER TABLE "tb_celula" ADD CONSTRAINT "tb_celula_id_igreja_fkey" FOREIGN KEY ("id_igreja") REFERENCES "tb_igreja"("id_igreja") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_membro" ADD CONSTRAINT "tb_membro_id_celula_alocada_fkey" FOREIGN KEY ("id_celula_alocada") REFERENCES "tb_celula"("id_celula") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_membro" ADD CONSTRAINT "tb_membro_id_usuario_triagem_fkey" FOREIGN KEY ("id_usuario_triagem") REFERENCES "tb_usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_membro" ADD CONSTRAINT "tb_membro_id_igreja_fkey" FOREIGN KEY ("id_igreja") REFERENCES "tb_igreja"("id_igreja") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_assinatura" ADD CONSTRAINT "tb_assinatura_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "tb_usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_promocao" ADD CONSTRAINT "tb_promocao_id_assinatura_fkey" FOREIGN KEY ("id_assinatura") REFERENCES "tb_assinatura"("id_assinatura") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_desconto" ADD CONSTRAINT "tb_desconto_id_promocao_fkey" FOREIGN KEY ("id_promocao") REFERENCES "tb_promocao"("id_promocao") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_desconto" ADD CONSTRAINT "tb_desconto_id_assinatura_fkey" FOREIGN KEY ("id_assinatura") REFERENCES "tb_assinatura"("id_assinatura") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_fatura" ADD CONSTRAINT "tb_fatura_id_assinatura_fkey" FOREIGN KEY ("id_assinatura") REFERENCES "tb_assinatura"("id_assinatura") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_lista_espera" ADD CONSTRAINT "tb_lista_espera_id_membro_fkey" FOREIGN KEY ("id_membro") REFERENCES "tb_membro"("id_membro") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_disponibilidade_membro" ADD CONSTRAINT "tb_disponibilidade_membro_id_membro_fkey" FOREIGN KEY ("id_membro") REFERENCES "tb_membro"("id_membro") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_log_triagem" ADD CONSTRAINT "tb_log_triagem_id_membro_fkey" FOREIGN KEY ("id_membro") REFERENCES "tb_membro"("id_membro") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_log_triagem" ADD CONSTRAINT "tb_log_triagem_id_resp_decisao_fkey" FOREIGN KEY ("id_resp_decisao") REFERENCES "tb_usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_feedback" ADD CONSTRAINT "tb_feedback_id_membro_fkey" FOREIGN KEY ("id_membro") REFERENCES "tb_membro"("id_membro") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_historico_celulas" ADD CONSTRAINT "tb_historico_celulas_id_celula_fkey" FOREIGN KEY ("id_celula") REFERENCES "tb_celula"("id_celula") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssinaturaToPlano" ADD CONSTRAINT "_AssinaturaToPlano_A_fkey" FOREIGN KEY ("A") REFERENCES "tb_assinatura"("id_assinatura") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssinaturaToPlano" ADD CONSTRAINT "_AssinaturaToPlano_B_fkey" FOREIGN KEY ("B") REFERENCES "tb_plano"("id_plano") ON DELETE CASCADE ON UPDATE CASCADE;
