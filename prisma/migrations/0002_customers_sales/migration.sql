-- Customers and basic sales history for engagement filters.

CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'STORE_CREDIT', 'VOUCHER', 'MIXED');

CREATE TABLE "customers" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "document" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "whatsapp" TEXT,
  "birthDate" TIMESTAMP(3),
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  "firstPurchaseAt" TIMESTAMP(3),
  "lastPurchaseAt" TIMESTAMP(3),
  "purchaseCount" INTEGER NOT NULL DEFAULT 0,
  "totalSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sales" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT,
  "userId" TEXT,
  "code" TEXT NOT NULL,
  "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
  "paymentMethod" "PaymentMethod" NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "surcharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sale_items" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customers_tenantId_document_key" ON "customers"("tenantId", "document");
CREATE INDEX "customers_tenantId_name_idx" ON "customers"("tenantId", "name");
CREATE INDEX "customers_tenantId_lastPurchaseAt_idx" ON "customers"("tenantId", "lastPurchaseAt");
CREATE INDEX "customers_tenantId_purchaseCount_idx" ON "customers"("tenantId", "purchaseCount");
CREATE UNIQUE INDEX "sales_tenantId_code_key" ON "sales"("tenantId", "code");
CREATE INDEX "sales_tenantId_soldAt_idx" ON "sales"("tenantId", "soldAt");
CREATE INDEX "sales_customerId_idx" ON "sales"("customerId");
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
