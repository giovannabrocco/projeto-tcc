/*
  Warnings:

  - Added the required column `email` to the `tb_membro` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tb_membro" ADD COLUMN     "email" TEXT NOT NULL;
