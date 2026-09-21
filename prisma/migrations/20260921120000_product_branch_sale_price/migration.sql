-- A product keeps its tenant-wide default price and may have a price override in a specific store.
ALTER TABLE "product_branch_stocks"
ADD COLUMN "salePrice" DECIMAL(12,2);
