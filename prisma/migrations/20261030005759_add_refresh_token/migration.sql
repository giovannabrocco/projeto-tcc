-- CreateTable
CREATE TABLE "tb_refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tb_refresh_tokens_token_key" ON "tb_refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_refresh_token_user_id" ON "tb_refresh_tokens"("userId");

-- AddForeignKey
ALTER TABLE "tb_refresh_tokens" ADD CONSTRAINT "tb_refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "tb_usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
