/*
  Warnings:

  - Changed the type of `telefone` on the `tb_membro` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "tb_membro" DROP COLUMN "telefone",
ADD COLUMN     "telefone" INTEGER NOT NULL;
