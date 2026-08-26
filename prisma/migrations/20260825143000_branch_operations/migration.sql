-- Separate operational data by branch while keeping customers and the product catalog shared.
CREATE TABLE "product_branch_stocks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stockQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "maxStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_branch_stocks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "sales" ADD COLUMN "branchId" TEXT;
ALTER TABLE "inventory_movements" ADD COLUMN "branchId" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN "branchId" TEXT;

-- Preserve the existing balances in the main branch.
INSERT INTO "product_branch_stocks" (
    "id", "tenantId", "branchId", "productId", "stockQuantity", "minStock", "maxStock", "location", "updatedAt"
)
SELECT
    'pbs_' || md5(p."id" || b."id"),
    p."tenantId",
    b."id",
    p."id",
    p."stockQuantity",
    p."minStock",
    p."maxStock",
    p."location",
    CURRENT_TIMESTAMP
FROM "products" p
JOIN LATERAL (
    SELECT "id"
    FROM "branches"
    WHERE "tenantId" = p."tenantId" AND "status" = 'ACTIVE'
    ORDER BY "isMain" DESC, "createdAt" ASC
    LIMIT 1
) b ON TRUE;

UPDATE "sales" s
SET "branchId" = COALESCE(
    (SELECT utr."branchId" FROM "user_tenant_roles" utr WHERE utr."tenantId" = s."tenantId" AND utr."userId" = s."userId" AND utr."branchId" IS NOT NULL AND utr."isActive" = TRUE LIMIT 1),
    (SELECT b."id" FROM "branches" b WHERE b."tenantId" = s."tenantId" ORDER BY b."isMain" DESC, b."createdAt" ASC LIMIT 1)
);

UPDATE "inventory_movements" m
SET "branchId" = COALESCE(
    (SELECT utr."branchId" FROM "user_tenant_roles" utr WHERE utr."tenantId" = m."tenantId" AND utr."userId" = m."userId" AND utr."branchId" IS NOT NULL AND utr."isActive" = TRUE LIMIT 1),
    (SELECT b."id" FROM "branches" b WHERE b."tenantId" = m."tenantId" ORDER BY b."isMain" DESC, b."createdAt" ASC LIMIT 1)
);

UPDATE "financial_entries" f
SET "branchId" = COALESCE(
    (SELECT s."branchId" FROM "sales" s WHERE s."id" = f."saleId"),
    (SELECT b."id" FROM "branches" b WHERE b."tenantId" = f."tenantId" ORDER BY b."isMain" DESC, b."createdAt" ASC LIMIT 1)
);

ALTER TABLE "sales" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "inventory_movements" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "financial_entries" ALTER COLUMN "branchId" SET NOT NULL;

CREATE UNIQUE INDEX "product_branch_stocks_branchId_productId_key" ON "product_branch_stocks"("branchId", "productId");
CREATE INDEX "product_branch_stocks_tenantId_branchId_idx" ON "product_branch_stocks"("tenantId", "branchId");
CREATE INDEX "product_branch_stocks_productId_idx" ON "product_branch_stocks"("productId");
CREATE INDEX "sales_branchId_soldAt_idx" ON "sales"("branchId", "soldAt");
CREATE INDEX "inventory_movements_branchId_createdAt_idx" ON "inventory_movements"("branchId", "createdAt");
CREATE INDEX "financial_entries_branchId_dueDate_idx" ON "financial_entries"("branchId", "dueDate");

ALTER TABLE "product_branch_stocks" ADD CONSTRAINT "product_branch_stocks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_branch_stocks" ADD CONSTRAINT "product_branch_stocks_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_branch_stocks" ADD CONSTRAINT "product_branch_stocks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
