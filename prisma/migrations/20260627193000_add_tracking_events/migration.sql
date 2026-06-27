-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PAGEVIEW', 'CLICK', 'CONVERSION', 'EXPOSURE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "sdkKey" TEXT;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "name" TEXT,
    "path" TEXT,
    "referrer" TEXT,
    "experimentId" TEXT,
    "variantId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_projectId_createdAt_idx" ON "Event"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Event_projectId_type_createdAt_idx" ON "Event"("projectId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Event_projectId_visitorId_idx" ON "Event"("projectId", "visitorId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_sdkKey_key" ON "Project"("sdkKey");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

