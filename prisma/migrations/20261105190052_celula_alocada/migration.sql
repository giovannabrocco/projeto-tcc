-- DropForeignKey
ALTER TABLE "tb_membro" DROP CONSTRAINT "tb_membro_id_celula_alocada_fkey";

-- AlterTable
ALTER TABLE "tb_membro" ALTER COLUMN "id_celula_alocada" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tb_membro" ADD CONSTRAINT "tb_membro_id_celula_alocada_fkey" FOREIGN KEY ("id_celula_alocada") REFERENCES "tb_celula"("id_celula") ON DELETE SET NULL ON UPDATE CASCADE;
