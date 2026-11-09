/*
  Warnings:

  - Changed the type of `latitude_membro` on the `tb_membro` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `longitude_membro` on the `tb_membro` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "tb_membro" DROP COLUMN "latitude_membro",
ADD COLUMN     "latitude_membro" INTEGER NOT NULL,
DROP COLUMN "longitude_membro",
ADD COLUMN     "longitude_membro" INTEGER NOT NULL;
