CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "CashMovementType" AS ENUM ('CASH_SALE', 'SUPPLY', 'WITHDRAWAL');

CREATE TABLE "cash_register_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "openedById" TEXT,
    "closedById" TEXT,
    "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "openingAmount" DECIMAL(12,2) NOT NULL,
    "expectedClosingAmount" DECIMAL(12,2),
    "actualClosingAmount" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "openingNotes" TEXT,
    "closingNotes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cash_register_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cash_register_movements" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cash_register_movements_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "sales" ADD COLUMN "cashRegisterSessionId" TEXT;

CREATE INDEX "cash_register_sessions_tenantId_branchId_status_idx" ON "cash_register_sessions"("tenantId", "branchId", "status");
CREATE INDEX "cash_register_sessions_branchId_openedAt_idx" ON "cash_register_sessions"("branchId", "openedAt");
CREATE UNIQUE INDEX "cash_register_sessions_one_open_per_branch" ON "cash_register_sessions"("branchId") WHERE "status" = 'OPEN';
CREATE INDEX "cash_register_movements_sessionId_createdAt_idx" ON "cash_register_movements"("sessionId", "createdAt");
CREATE INDEX "cash_register_movements_tenantId_branchId_createdAt_idx" ON "cash_register_movements"("tenantId", "branchId", "createdAt");
CREATE INDEX "sales_cashRegisterSessionId_idx" ON "sales"("cashRegisterSessionId");

ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "cash_register_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashRegisterSessionId_fkey" FOREIGN KEY ("cashRegisterSessionId") REFERENCES "cash_register_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "name", "module", "description", "createdAt", "updatedAt") VALUES
  ('perm_cash_read', 'cash.read', 'Visualizar caixa', 'cash', 'Consulta abertura, movimentações, fechamento e histórico do caixa.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_cash_write', 'cash.write', 'Operar caixa', 'cash', 'Abre e fecha o caixa e registra sangrias e suprimentos.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."isSystem" = TRUE AND p."key" IN ('cash.read', 'cash.write')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
