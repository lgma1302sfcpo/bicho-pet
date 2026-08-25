import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const previousDocument = "12345678000190";
const cnpj = "55742132000180";

try {
  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ document: cnpj }, { document: previousDocument }, { name: "Pet Shop Boqueirão" }] }
  });
  if (!tenant) throw new Error("A empresa principal local nao foi encontrada.");
  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: "Pet Shop Casa dos Bichos",
        legalName: "Marcelo Vazquez de Oliveira Pet Shop",
        document: cnpj,
        email: null,
        phone: null
      }
    }),
    prisma.fiscalConfiguration.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        legalName: "Marcelo Vazquez de Oliveira Pet Shop",
        tradeName: "Pet Shop Casa dos Bichos",
        cnpj,
        stateRegistration: "558897276110",
        taxRegime: "SIMPLES_NACIONAL",
        state: "SP",
        environment: "HOMOLOGATION",
        provider: "DIRECT_SEFAZ_SP",
        certificateType: "NONE",
        enableNfe: true,
        enableNfce: true,
        enableNfse: false,
        autoEmail: false,
        directTransmissionEnabled: false
      },
      update: {
        legalName: "Marcelo Vazquez de Oliveira Pet Shop",
        tradeName: "Pet Shop Casa dos Bichos",
        cnpj,
        stateRegistration: "558897276110",
        taxRegime: "SIMPLES_NACIONAL",
        state: "SP",
        environment: "HOMOLOGATION",
        provider: "DIRECT_SEFAZ_SP",
        enableNfe: true,
        enableNfce: true,
        enableNfse: false,
        directTransmissionEnabled: false,
        accountantApprovedAt: null
      }
    })
  ]);
  console.log("Dados empresariais conhecidos aplicados a Pet Shop Casa dos Bichos; campos desconhecidos permaneceram vazios.");
} finally {
  await prisma.$disconnect();
}
