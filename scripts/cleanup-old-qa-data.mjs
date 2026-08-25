import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sales = await prisma.sale.findMany({ where: { notes: "Venda de teste automatizado" }, select: { id: true, code: true } });
const saleIds = sales.map((sale) => sale.id);
const saleCodes = sales.map((sale) => sale.code);
if (saleIds.length) {
  await prisma.financialEntry.deleteMany({ where: { saleId: { in: saleIds } } });
  await prisma.inventoryMovement.deleteMany({ where: { reference: { in: saleCodes } } });
  await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });
}
const qaProducts = await prisma.product.findMany({ where: { code: { startsWith: "QA-" } }, select: { id: true } });
const productIds = qaProducts.map((product) => product.id);
if (productIds.length) {
  await prisma.inventoryMovement.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
}
console.log(`Limpeza concluida: ${saleIds.length} vendas e ${productIds.length} produtos de testes antigos removidos.`);
await prisma.$disconnect();
