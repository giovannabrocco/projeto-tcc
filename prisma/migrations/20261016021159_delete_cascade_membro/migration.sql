-- DropForeignKey
ALTER TABLE "tb_membro" DROP CONSTRAINT "tb_membro_id_usuario_triagem_fkey";

-- AddForeignKey
ALTER TABLE "tb_membro" ADD CONSTRAINT "tb_membro_id_usuario_triagem_fkey" FOREIGN KEY ("id_usuario_triagem") REFERENCES "tb_usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
