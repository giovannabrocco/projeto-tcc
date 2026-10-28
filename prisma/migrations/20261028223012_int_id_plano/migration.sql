/*
  Warnings:

  - Changed the type of `id_plano` on the `tb_assinatura` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "tb_assinatura" DROP COLUMN "id_plano",
ADD COLUMN     "id_plano" INTEGER NOT NULL;
