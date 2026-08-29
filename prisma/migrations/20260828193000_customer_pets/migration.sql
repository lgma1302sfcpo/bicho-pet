CREATE TYPE "PetSex" AS ENUM ('MALE', 'FEMALE');

CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "PetSpecies" NOT NULL,
    "sex" "PetSex" NOT NULL,
    "breed" TEXT,
    "birthDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pets_customerId_idx" ON "pets"("customerId");

ALTER TABLE "pets"
ADD CONSTRAINT "pets_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
