-- Identity core: multiempresa, usuarios, cargos, permissoes e NextAuth.

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');
CREATE TYPE "PasswordResetStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED');

CREATE TABLE "tenants" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "legalName" TEXT,
  "document" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "branches" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "document" TEXT,
  "isMain" BOOLEAN NOT NULL DEFAULT false,
  "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "phone" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roles" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permissions" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_permissions" (
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "user_tenant_roles" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "branchId" TEXT,
  "isOwner" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_tenant_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "PasswordResetStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "tenants_document_key" ON "tenants"("document");
CREATE INDEX "branches_tenantId_idx" ON "branches"("tenantId");
CREATE UNIQUE INDEX "branches_tenantId_document_key" ON "branches"("tenantId", "document");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "roles_tenantId_idx" ON "roles"("tenantId");
CREATE UNIQUE INDEX "roles_tenantId_name_key" ON "roles"("tenantId", "name");
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");
CREATE INDEX "permissions_module_idx" ON "permissions"("module");
CREATE INDEX "user_tenant_roles_tenantId_roleId_idx" ON "user_tenant_roles"("tenantId", "roleId");
CREATE INDEX "user_tenant_roles_userId_idx" ON "user_tenant_roles"("userId");
CREATE UNIQUE INDEX "user_tenant_roles_userId_tenantId_roleId_key" ON "user_tenant_roles"("userId", "tenantId", "roleId");
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_status_idx" ON "password_reset_tokens"("userId", "status");
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

ALTER TABLE "branches" ADD CONSTRAINT "branches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
