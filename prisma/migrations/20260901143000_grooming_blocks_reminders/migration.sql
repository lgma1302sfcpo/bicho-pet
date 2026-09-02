ALTER TABLE "grooming_appointments" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

CREATE TABLE "grooming_schedule_blocks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "professionalId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "grooming_schedule_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "grooming_schedule_blocks_tenantId_branchId_startAt_idx" ON "grooming_schedule_blocks"("tenantId", "branchId", "startAt");
CREATE INDEX "grooming_schedule_blocks_professionalId_startAt_endAt_idx" ON "grooming_schedule_blocks"("professionalId", "startAt", "endAt");

ALTER TABLE "grooming_schedule_blocks" ADD CONSTRAINT "grooming_schedule_blocks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grooming_schedule_blocks" ADD CONSTRAINT "grooming_schedule_blocks_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grooming_schedule_blocks" ADD CONSTRAINT "grooming_schedule_blocks_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "grooming_professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
