-- Petshop product catalog.

CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');
CREATE TYPE "PetSpecies" AS ENUM ('ALL', 'DOG', 'CAT', 'BIRD', 'FISH', 'RODENT', 'OTHER');

CREATE TABLE "products" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "sku" TEXT,
  "barcode" TEXT,
  "category" TEXT NOT NULL,
  "brand" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'UN',
  "species" "PetSpecies" NOT NULL DEFAULT 'ALL',
  "description" TEXT,
  "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "salePrice" DECIMAL(12,2) NOT NULL,
  "marginPercent" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "stockQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "minStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "maxStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "location" TEXT,
  "imageUrl" TEXT,
  "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_tenantId_code_key" ON "products"("tenantId", "code");
CREATE UNIQUE INDEX "products_tenantId_sku_key" ON "products"("tenantId", "sku");
CREATE UNIQUE INDEX "products_tenantId_barcode_key" ON "products"("tenantId", "barcode");
CREATE INDEX "products_tenantId_name_idx" ON "products"("tenantId", "name");
CREATE INDEX "products_tenantId_category_idx" ON "products"("tenantId", "category");
CREATE INDEX "products_tenantId_species_idx" ON "products"("tenantId", "species");
CREATE INDEX "products_tenantId_status_idx" ON "products"("tenantId", "status");

ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
