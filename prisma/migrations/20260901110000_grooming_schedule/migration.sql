CREATE TYPE "GroomingAppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

CREATE TABLE "grooming_professionals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "grooming_professionals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "grooming_services" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "defaultPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "grooming_services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "grooming_appointments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "createdById" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "GroomingAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "price" DECIMAL(12,2) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isPackage" BOOLEAN NOT NULL DEFAULT false,
    "purchasedProducts" BOOLEAN NOT NULL DEFAULT false,
    "photoTaken" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "grooming_appointments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "grooming_professionals_branchId_name_key" ON "grooming_professionals"("branchId", "name");
CREATE INDEX "grooming_professionals_tenantId_branchId_active_idx" ON "grooming_professionals"("tenantId", "branchId", "active");
CREATE UNIQUE INDEX "grooming_services_branchId_name_key" ON "grooming_services"("branchId", "name");
CREATE INDEX "grooming_services_tenantId_branchId_active_idx" ON "grooming_services"("tenantId", "branchId", "active");
CREATE INDEX "grooming_appointments_tenantId_branchId_startAt_idx" ON "grooming_appointments"("tenantId", "branchId", "startAt");
CREATE INDEX "grooming_appointments_professionalId_startAt_endAt_idx" ON "grooming_appointments"("professionalId", "startAt", "endAt");
CREATE INDEX "grooming_appointments_customerId_startAt_idx" ON "grooming_appointments"("customerId", "startAt");
CREATE INDEX "grooming_appointments_petId_startAt_idx" ON "grooming_appointments"("petId", "startAt");

ALTER TABLE "grooming_professionals" ADD CONSTRAINT "grooming_professionals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grooming_professionals" ADD CONSTRAINT "grooming_professionals_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grooming_services" ADD CONSTRAINT "grooming_services_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grooming_services" ADD CONSTRAINT "grooming_services_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "grooming_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "grooming_professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grooming_appointments" ADD CONSTRAINT "grooming_appointments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "name", "module", "description", "createdAt", "updatedAt") VALUES
('perm_grooming_read', 'grooming.read', 'Visualizar agenda de banho e tosa', 'grooming', 'Consulta profissionais, serviços e horários agendados.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('perm_grooming_write', 'grooming.write', 'Gerenciar agenda de banho e tosa', 'grooming', 'Cadastra serviços, profissionais e agendamentos.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE (r."isSystem" = true OR r."name" = 'Administrador')
  AND p."key" IN ('grooming.read', 'grooming.write')
ON CONFLICT DO NOTHING;

INSERT INTO "grooming_services" ("id", "tenantId", "branchId", "name", "durationMinutes", "defaultPrice", "createdAt", "updatedAt")
SELECT 'grooming_bath_' || b."id", b."tenantId", b."id", 'Banho', 60, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "branches" b WHERE b."status" = 'ACTIVE'
ON CONFLICT DO NOTHING;
INSERT INTO "grooming_services" ("id", "tenantId", "branchId", "name", "durationMinutes", "defaultPrice", "createdAt", "updatedAt")
SELECT 'grooming_full_' || b."id", b."tenantId", b."id", 'Banho e tosa completa', 90, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "branches" b WHERE b."status" = 'ACTIVE'
ON CONFLICT DO NOTHING;
INSERT INTO "grooming_services" ("id", "tenantId", "branchId", "name", "durationMinutes", "defaultPrice", "createdAt", "updatedAt")
SELECT 'grooming_scissors_' || b."id", b."tenantId", b."id", 'Tosa na tesoura', 120, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "branches" b WHERE b."status" = 'ACTIVE'
ON CONFLICT DO NOTHING;
