ALTER TABLE "sales" ADD COLUMN "offlineId" TEXT;
CREATE UNIQUE INDEX "sales_offlineId_key" ON "sales"("offlineId");
