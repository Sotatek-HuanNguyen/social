-- CreateTable
CREATE TABLE "CryptoSnapshot" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CryptoSnapshot_source_idx" ON "CryptoSnapshot"("source");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoSnapshot_source_symbol_key" ON "CryptoSnapshot"("source", "symbol");
