/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `tb_membro` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "tb_membro_email_key" ON "tb_membro"("email");
