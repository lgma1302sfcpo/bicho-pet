import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const user = await prisma.user.findUnique({ where: { email: "qa.erp@example.invalid" }, include: { memberships: { where: { isActive: true }, take: 1 } } });
if (!user?.memberships[0]) throw new Error("Entre uma vez com qa.erp@example.invalid antes de carregar a base local.");
const tenantId = user.memberships[0].tenantId;

const catalog = [
  { code: "RAC-SC-20", name: "Special Cat Adultos Mix 20 quilogramas", category: "Racao", subcategory: "Racao seca", brand: "Special Cat", supplier: "Adimax", unit: "UN", species: "CAT", costPrice: 202.76, salePrice: 282, stockQuantity: 14, minStock: 5, maxStock: 30 },
  { code: "RAC-GP-15", name: "GranPlus Menu Caes Adultos 15 quilogramas", category: "Racao", subcategory: "Racao seca", brand: "GranPlus", supplier: "Adimax", unit: "UN", species: "DOG", costPrice: 145.9, salePrice: 209.9, stockQuantity: 11, minStock: 4, maxStock: 24 },
  { code: "HIG-CLO-500", name: "Shampoo Clorexidina 500 mililitros", category: "Higiene", subcategory: "Banho e tosa", brand: "Outras marcas", supplier: "Distribuidor regional", unit: "UN", species: "ALL", costPrice: 21.5, salePrice: 33.9, stockQuantity: 7, minStock: 3, maxStock: 15 },
  { code: "MED-AUR-15", name: "Auritop 15 gramas", category: "Medicamento", subcategory: "Antipulgas", brand: "Outras marcas", supplier: "Distribuidor regional", unit: "UN", species: "ALL", costPrice: 54.9, salePrice: 79.9, stockQuantity: 3, minStock: 3, maxStock: 12 },
  { code: "PET-NAT-100", name: "Petisco Natural Bovino 100 gramas", category: "Petisco", subcategory: "Petisco natural", brand: "Outras marcas", supplier: "Distribuidora Petmar", unit: "PC", species: "DOG", costPrice: 8.4, salePrice: 14.9, stockQuantity: 26, minStock: 8, maxStock: 40 }
];

const products = [];
for (const item of catalog) {
  const marginPercent = Math.round(((item.salePrice - item.costPrice) / item.costPrice) * 10000) / 100;
  const product = await prisma.product.upsert({ where: { tenantId_code: { tenantId, code: item.code } }, update: { ...item, marginPercent, status: "ACTIVE" }, create: { tenantId, ...item, marginPercent } });
  products.push(product);
  const hasOpening = await prisma.inventoryMovement.findFirst({ where: { tenantId, productId: product.id, reference: "SALDO-INICIAL-LOCAL" } });
  if (!hasOpening) await prisma.inventoryMovement.create({ data: { tenantId, productId: product.id, userId: user.id, type: "ENTRY", quantity: item.stockQuantity, previousBalance: 0, newBalance: item.stockQuantity, reason: "Saldo inicial conferido", reference: "SALDO-INICIAL-LOCAL" } });
}

const salesData = [
  { code: "VD-20260819-001", daysAgo: 5, paymentMethod: "PIX", items: [[0, 1], [4, 2]] },
  { code: "VD-20260820-001", daysAgo: 4, paymentMethod: "CREDIT_CARD", items: [[1, 1], [2, 1]] },
  { code: "VD-20260821-001", daysAgo: 3, paymentMethod: "DEBIT_CARD", items: [[3, 1], [4, 3]] },
  { code: "VD-20260822-001", daysAgo: 2, paymentMethod: "CASH", items: [[2, 2], [4, 1]] },
  { code: "VD-20260823-001", daysAgo: 1, paymentMethod: "PIX", items: [[1, 1], [4, 2]] },
  { code: "VD-20260824-001", daysAgo: 0, paymentMethod: "PIX", items: [[0, 1], [2, 1]] }
];

for (const definition of salesData) {
  if (await prisma.sale.findUnique({ where: { tenantId_code: { tenantId, code: definition.code } } })) continue;
  const soldAt = new Date(); soldAt.setDate(soldAt.getDate() - definition.daysAgo); soldAt.setHours(10 + definition.daysAgo, 15, 0, 0);
  const items = definition.items.map(([index, quantity]) => { const product = products[index]; const unitPrice = Number(product.salePrice); return { productId: product.id, description: product.name, quantity, unitPrice, costPrice: product.costPrice, category: product.category, brand: product.brand, supplier: product.supplier, total: unitPrice * quantity }; });
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const sale = await prisma.sale.create({ data: { tenantId, userId: user.id, code: definition.code, paymentMethod: definition.paymentMethod, subtotal: total, total, soldAt, notes: "Venda registrada na base local", items: { create: items } } });
  await prisma.financialEntry.create({ data: { tenantId, saleId: sale.id, type: "REVENUE", status: "PAID", description: `Venda ${sale.code}`, category: "Vendas", amount: total, dueDate: soldAt, paidAt: soldAt, paymentMethod: definition.paymentMethod } });
}

const expenses = [
  { description: "Aluguel do ponto comercial", category: "Aluguel", amount: 1850, days: 5, status: "PAID" },
  { description: "Energia eletrica", category: "Energia eletrica", amount: 428.7, days: 2, status: "PAID" },
  { description: "Reposicao de racoes", category: "Fornecedores", amount: 2200, days: 4, status: "PENDING" }
];
for (const expense of expenses) {
  const exists = await prisma.financialEntry.findFirst({ where: { tenantId, type: "EXPENSE", description: expense.description, notes: "BASE-LOCAL" } });
  if (!exists) { const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + (expense.status === "PENDING" ? expense.days : -expense.days)); await prisma.financialEntry.create({ data: { tenantId, type: "EXPENSE", status: expense.status, description: expense.description, category: expense.category, amount: expense.amount, dueDate, paidAt: expense.status === "PAID" ? dueDate : null, paymentMethod: "PIX", notes: "BASE-LOCAL" } }); }
}

console.log(`Base local carregada para o tenant ${tenantId}: ${products.length} produtos e ${salesData.length} vendas de referencia.`);
await prisma.$disconnect();
