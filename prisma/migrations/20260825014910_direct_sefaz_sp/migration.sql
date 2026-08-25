-- AlterEnum
ALTER TYPE "FiscalDocumentStatus" ADD VALUE 'CONTINGENCY_PENDING';

-- AlterEnum
ALTER TYPE "FiscalProviderType" ADD VALUE 'DIRECT_SEFAZ_SP';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "cityCode" TEXT,
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "stateRegistration" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- AlterTable
ALTER TABLE "fiscal_configurations" ADD COLUMN     "directTransmissionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "schemaPackage" TEXT NOT NULL DEFAULT '010e_v1.02';

-- AlterTable
ALTER TABLE "fiscal_documents" ADD COLUMN     "cancellationProtocol" TEXT,
ADD COLUMN     "cancellationXmlContent" TEXT;

-- CreateTable
CREATE TABLE "fiscal_number_voids" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "FiscalDocumentType" NOT NULL,
    "environment" "FiscalEnvironment" NOT NULL,
    "provider" "FiscalProviderType" NOT NULL,
    "series" INTEGER NOT NULL,
    "numberFrom" INTEGER NOT NULL,
    "numberTo" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "protocol" TEXT,
    "rejectionCode" TEXT,
    "rejectionReason" TEXT,
    "xmlContent" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiscal_number_voids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fiscal_number_voids_tenantId_createdAt_idx" ON "fiscal_number_voids"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "fiscal_number_voids_tenantId_type_environment_series_idx" ON "fiscal_number_voids"("tenantId", "type", "environment", "series");

-- AddForeignKey
ALTER TABLE "fiscal_number_voids" ADD CONSTRAINT "fiscal_number_voids_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
