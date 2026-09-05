-- Link cash movements to their sale and keep an auditable history whenever a
-- payment method is corrected during cash reconciliation.
ALTER TABLE "cash_register_movements" ADD COLUMN "saleId" TEXT;

UPDATE "cash_register_movements" movement
SET "saleId" = sale."id"
FROM "sales" sale
WHERE movement."sessionId" = sale."cashRegisterSessionId"
  AND movement."type" = 'CASH_SALE'
  AND movement."description" = 'Venda ' || sale."code";

CREATE TABLE "sale_payment_corrections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "correctedById" TEXT,
    "oldPaymentMethod" "PaymentMethod" NOT NULL,
    "newPaymentMethod" "PaymentMethod" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sale_payment_corrections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cash_register_movements_saleId_idx" ON "cash_register_movements"("saleId");
CREATE INDEX "sale_payment_corrections_saleId_createdAt_idx" ON "sale_payment_corrections"("saleId", "createdAt");
CREATE INDEX "sale_payment_corrections_tenantId_branchId_createdAt_idx" ON "sale_payment_corrections"("tenantId", "branchId", "createdAt");

ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sale_payment_corrections" ADD CONSTRAINT "sale_payment_corrections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_payment_corrections" ADD CONSTRAINT "sale_payment_corrections_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_payment_corrections" ADD CONSTRAINT "sale_payment_corrections_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_payment_corrections" ADD CONSTRAINT "sale_payment_corrections_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
