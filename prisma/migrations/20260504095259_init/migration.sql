-- CreateEnum
CREATE TYPE "Category" AS ENUM ('ECONOMIC', 'POLITICAL', 'GENERAL');

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "source" TEXT NOT NULL,
    "category" "Category" NOT NULL DEFAULT 'GENERAL',
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBreaking" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "keywords" TEXT[],
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_url_key" ON "Article"("url");

-- CreateIndex
CREATE INDEX "Article_category_publishedAt_idx" ON "Article"("category", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "Article_publishedAt_idx" ON "Article"("publishedAt" DESC);
