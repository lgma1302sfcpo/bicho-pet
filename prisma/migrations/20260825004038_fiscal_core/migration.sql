-- CreateEnum
CREATE TYPE "FiscalEnvironment" AS ENUM ('HOMOLOGATION', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "FiscalProviderType" AS ENUM ('SANDBOX', 'EXTERNAL_API', 'NOT_CONFIGURED');

-- CreateEnum
CREATE TYPE "FiscalDocumentType" AS ENUM ('NFE', 'NFCE', 'NFSE');

-- CreateEnum
CREATE TYPE "FiscalDocumentStatus" AS ENUM ('PROCESSING', 'AUTHORIZED', 'REJECTED', 'CANCELLED', 'ERROR');

-- CreateEnum
CREATE TYPE "FiscalEventType" AS ENUM ('ISSUE', 'QUERY', 'CANCEL', 'VOID_NUMBER', 'REPLACE', 'EMAIL', 'RETRY');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "cest" TEXT,
ADD COLUMN     "cofinsCode" TEXT,
ADD COLUMN     "defaultCfop" TEXT,
ADD COLUMN     "fiscalApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fiscalItemType" TEXT NOT NULL DEFAULT 'GOOD',
ADD COLUMN     "ibsCbsCode" TEXT,
ADD COLUMN     "icmsCode" TEXT,
ADD COLUMN     "issRate" DECIMAL(7,4),
ADD COLUMN     "ncm" TEXT,
ADD COLUMN     "originCode" TEXT,
ADD COLUMN     "pisCode" TEXT,
ADD COLUMN     "serviceCode" TEXT,
ADD COLUMN     "taxClassificationCode" TEXT;

-- CreateTable
CREATE TABLE "fiscal_configurations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalName" TEXT,
    "tradeName" TEXT,
    "cnpj" TEXT,
    "stateRegistration" TEXT,
    "municipalRegistration" TEXT,
    "taxRegime" TEXT,
    "cnae" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "cityCode" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "environment" "FiscalEnvironment" NOT NULL DEFAULT 'HOMOLOGATION',
    "provider" "FiscalProviderType" NOT NULL DEFAULT 'SANDBOX',
    "providerBaseUrl" TEXT,
    "providerTokenEncrypted" TEXT,
    "certificateType" TEXT NOT NULL DEFAULT 'NONE',
    "certificateExpiresAt" TIMESTAMP(3),
    "certificateName" TEXT,
    "certificateDataEncrypted" TEXT,
    "certificatePasswordEncrypted" TEXT,
    "nfceSecurityCodeId" TEXT,
    "nfceSecurityCodeEncrypted" TEXT,
    "enableNfe" BOOLEAN NOT NULL DEFAULT false,
    "enableNfce" BOOLEAN NOT NULL DEFAULT false,
    "enableNfse" BOOLEAN NOT NULL DEFAULT false,
    "autoEmail" BOOLEAN NOT NULL DEFAULT false,
    "accountantApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_sequences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "FiscalDocumentType" NOT NULL,
    "environment" "FiscalEnvironment" NOT NULL,
    "series" INTEGER NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "type" "FiscalDocumentType" NOT NULL,
    "environment" "FiscalEnvironment" NOT NULL,
    "provider" "FiscalProviderType" NOT NULL,
    "series" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "FiscalDocumentStatus" NOT NULL DEFAULT 'PROCESSING',
    "accessKey" TEXT,
    "protocol" TEXT,
    "providerId" TEXT,
    "rejectionCode" TEXT,
    "rejectionReason" TEXT,
    "xmlContent" TEXT,
    "pdfContent" BYTEA,
    "authorizedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "emailedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fiscalDocumentId" TEXT,
    "userId" TEXT,
    "type" "FiscalEventType" NOT NULL,
    "success" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiscal_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_configurations_tenantId_key" ON "fiscal_configurations"("tenantId");

-- CreateIndex
CREATE INDEX "fiscal_sequences_tenantId_type_idx" ON "fiscal_sequences"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_sequences_tenantId_type_environment_series_key" ON "fiscal_sequences"("tenantId", "type", "environment", "series");

-- CreateIndex
CREATE INDEX "fiscal_documents_tenantId_createdAt_idx" ON "fiscal_documents"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "fiscal_documents_tenantId_status_idx" ON "fiscal_documents"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_documents_tenantId_saleId_type_key" ON "fiscal_documents"("tenantId", "saleId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_documents_tenantId_type_environment_series_number_key" ON "fiscal_documents"("tenantId", "type", "environment", "series", "number");

-- CreateIndex
CREATE INDEX "fiscal_events_tenantId_createdAt_idx" ON "fiscal_events"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "fiscal_events_fiscalDocumentId_createdAt_idx" ON "fiscal_events"("fiscalDocumentId", "createdAt");

-- AddForeignKey
ALTER TABLE "fiscal_configurations" ADD CONSTRAINT "fiscal_configurations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_sequences" ADD CONSTRAINT "fiscal_sequences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_events" ADD CONSTRAINT "fiscal_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_events" ADD CONSTRAINT "fiscal_events_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES "fiscal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
