-- Customer registrations belong to one branch. Existing customers are assigned
-- to the branch of their latest sale, falling back to the tenant's main branch.
ALTER TABLE "customers" ADD COLUMN "branchId" TEXT;

UPDATE "customers" c
SET "branchId" = (
  SELECT s."branchId"
  FROM "sales" s
  WHERE s."customerId" = c."id"
  ORDER BY s."soldAt" DESC, s."createdAt" DESC
  LIMIT 1
)
WHERE EXISTS (SELECT 1 FROM "sales" s WHERE s."customerId" = c."id");

UPDATE "customers" c
SET "branchId" = (
  SELECT b."id"
  FROM "branches" b
  WHERE b."tenantId" = c."tenantId"
  ORDER BY b."isMain" DESC, b."createdAt" ASC
  LIMIT 1
)
WHERE c."branchId" IS NULL;

ALTER TABLE "customers" ALTER COLUMN "branchId" SET NOT NULL;

DROP INDEX "customers_tenantId_document_key";
DROP INDEX "customers_tenantId_name_idx";
DROP INDEX "customers_tenantId_lastPurchaseAt_idx";
DROP INDEX "customers_tenantId_purchaseCount_idx";

CREATE UNIQUE INDEX "customers_tenantId_branchId_document_key" ON "customers"("tenantId", "branchId", "document");
CREATE INDEX "customers_tenantId_branchId_name_idx" ON "customers"("tenantId", "branchId", "name");
CREATE INDEX "customers_tenantId_branchId_lastPurchaseAt_idx" ON "customers"("tenantId", "branchId", "lastPurchaseAt");
CREATE INDEX "customers_tenantId_branchId_purchaseCount_idx" ON "customers"("tenantId", "branchId", "purchaseCount");

ALTER TABLE "customers" ADD CONSTRAINT "customers_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
