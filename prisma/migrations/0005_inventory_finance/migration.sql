CREATE TYPE "InventoryMovementType" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT');
CREATE TYPE "FinancialEntryType" AS ENUM ('REVENUE', 'EXPENSE');
CREATE TYPE "FinancialEntryStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

CREATE TABLE "inventory_movements" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" TEXT,
  "type" "InventoryMovementType" NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "previousBalance" DECIMAL(12,3) NOT NULL,
  "newBalance" DECIMAL(12,3) NOT NULL,
  "reason" TEXT NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_entries" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "saleId" TEXT,
  "type" "FinancialEntryType" NOT NULL,
  "status" "FinancialEntryStatus" NOT NULL DEFAULT 'PENDING',
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "paymentMethod" "PaymentMethod",
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_movements_tenantId_createdAt_idx" ON "inventory_movements"("tenantId", "createdAt");
CREATE INDEX "inventory_movements_productId_createdAt_idx" ON "inventory_movements"("productId", "createdAt");
CREATE INDEX "financial_entries_tenantId_dueDate_idx" ON "financial_entries"("tenantId", "dueDate");
CREATE INDEX "financial_entries_tenantId_status_idx" ON "financial_entries"("tenantId", "status");
CREATE INDEX "financial_entries_saleId_idx" ON "financial_entries"("saleId");

ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
