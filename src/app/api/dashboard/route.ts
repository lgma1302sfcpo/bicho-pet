import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const number = (value: unknown) => Number(value ?? 0);

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.DASHBOARD_READ);
    const tenantId = session.user.currentTenantId;
    const branchId = session.user.currentBranchId ?? null;
    const branchFilter = branchId ? { branchId } : {};
    const now = new Date();
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 29); thirtyDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 6); sevenDaysAgo.setHours(0, 0, 0, 0);
    const [sales, products, pendingExpenses, recentExpenses] = await Promise.all([
      prisma.sale.findMany({ where: { tenantId, ...branchFilter, status: "COMPLETED", soldAt: { gte: thirtyDaysAgo } }, include: { customer: { select: { name: true } }, items: true }, orderBy: { soldAt: "desc" } }),
      prisma.product.findMany({ where: { tenantId, status: "ACTIVE" }, select: { branchStocks: { where: branchFilter, select: { stockQuantity: true, minStock: true } } } }),
      prisma.financialEntry.aggregate({ where: { tenantId, ...branchFilter, type: "EXPENSE", status: "PENDING" }, _sum: { amount: true } }),
      prisma.financialEntry.findMany({ where: { tenantId, ...branchFilter, type: "EXPENSE", status: "PAID", paidAt: { gte: sevenDaysAgo } }, orderBy: { paidAt: "asc" } })
    ]);
    const revenue = sales.reduce((sum, sale) => sum + number(sale.total), 0);
    const cost = sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + number(item.costPrice) * number(item.quantity), 0), 0);
    const productTotals = new Map<string, number>();
    for (const sale of sales) for (const item of sale.items) productTotals.set(item.description, (productTotals.get(item.description) ?? 0) + number(item.quantity));
    const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const cashFlow = Array.from({ length: 7 }, (_, offset) => { const date = new Date(sevenDaysAgo); date.setDate(sevenDaysAgo.getDate() + offset); const key = dayKey(date); return { day: date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }), revenue: sales.filter((sale) => dayKey(sale.soldAt) === key).reduce((sum, sale) => sum + number(sale.total), 0), expense: recentExpenses.filter((entry) => entry.paidAt && dayKey(entry.paidAt) === key).reduce((sum, entry) => sum + number(entry.amount), 0) }; });
    const paymentLabels: Record<string, string> = { CASH: "Dinheiro", PIX: "Pix", CREDIT_CARD: "Cartao de credito", DEBIT_CARD: "Cartao de debito", STORE_CREDIT: "Credito da loja", VOUCHER: "Vale", MIXED: "Pagamento combinado" };
    const upcomingExpenses = await prisma.financialEntry.findMany({ where: { tenantId, ...branchFilter, type: "EXPENSE", status: "PENDING" }, orderBy: { dueDate: "asc" }, take: 5 });
    const lowStock = products.filter((product) => product.branchStocks.some((stock) => number(stock.minStock) > 0 && number(stock.stockQuantity) <= number(stock.minStock))).length;
    return ok({ metrics: { revenue, grossProfit: revenue - cost, margin: revenue ? ((revenue - cost) / revenue) * 100 : 0, pendingExpenses: number(pendingExpenses._sum.amount), lowStock }, cashFlow, topProducts: Array.from(productTotals, ([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 5), latestSales: sales.slice(0, 5).map((sale) => ({ id: sale.id, code: sale.code, customerName: sale.customer?.name ?? "Consumidor final", paymentMethod: paymentLabels[sale.paymentMethod] ?? sale.paymentMethod, total: number(sale.total), soldAt: sale.soldAt.toISOString() })), upcomingExpenses: upcomingExpenses.map((entry) => ({ id: entry.id, description: entry.description, amount: number(entry.amount), dueDate: entry.dueDate.toISOString() })) });
  } catch (error) { return errorResponse(error); }
}
