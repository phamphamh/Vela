-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExperimentStatus" ADD VALUE 'QUEUED';
ALTER TYPE "ExperimentStatus" ADD VALUE 'CONCLUSIVE';

-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN     "prBranch" TEXT,
ADD COLUMN     "prNumber" INTEGER,
ADD COLUMN     "prUrl" TEXT,
ADD COLUMN     "split" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "targetPath" TEXT,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "content" TEXT,
ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "url" TEXT,
    "email" TEXT,
    "score" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Audit_createdAt_idx" ON "Audit"("createdAt");
