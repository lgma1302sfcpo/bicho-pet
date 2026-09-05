ALTER TABLE "sales"
  ADD COLUMN "cancelledById" TEXT,
  ADD COLUMN "cancellationReason" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE INDEX "sales_cancelledById_idx" ON "sales"("cancelledById");

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_cancelledById_fkey"
  FOREIGN KEY ("cancelledById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
