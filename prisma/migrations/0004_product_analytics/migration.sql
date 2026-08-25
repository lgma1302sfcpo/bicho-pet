-- Product supplier details and immutable sale snapshots used by analytic reports.

ALTER TABLE "products"
  ADD COLUMN "subcategory" TEXT,
  ADD COLUMN "supplier" TEXT;

ALTER TABLE "sale_items"
  ADD COLUMN "productId" TEXT,
  ADD COLUMN "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "supplier" TEXT;

CREATE INDEX "products_tenantId_supplier_idx" ON "products"("tenantId", "supplier");
CREATE INDEX "sale_items_productId_idx" ON "sale_items"("productId");

ALTER TABLE "sale_items"
  ADD CONSTRAINT "sale_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
