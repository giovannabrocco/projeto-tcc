/*
  Warnings:

  - A unique constraint covering the columns `[id_lider_celula]` on the table `tb_celula` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_lider_celula` to the `tb_celula` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tb_celula" ADD COLUMN     "id_lider_celula" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tb_celula_id_lider_celula_key" ON "tb_celula"("id_lider_celula");

-- CreateIndex
CREATE INDEX "fk_promocao_assinatura" ON "tb_promocao"("id_assinatura");
