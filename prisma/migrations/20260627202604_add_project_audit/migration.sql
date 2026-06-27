-- CreateTable
CREATE TABLE "ProjectAudit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectAudit_projectId_createdAt_idx" ON "ProjectAudit"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectAudit" ADD CONSTRAINT "ProjectAudit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
