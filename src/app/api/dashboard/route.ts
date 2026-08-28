import { NextRequest } from "next/server";
import { PaymentMethod } from "@prisma/client";
import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const number = (value: unknown) => Number(value ?? 0);

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.DASHBOARD_READ);
    const tenantId = session.user.currentTenantId;
    const branchId = session.user.currentBranchId ?? null;
    const branchFilter = branchId ? { branchId } : {};
    const requestedDays = Number(request.nextUrl.searchParams.get("period") ?? 30);
    const periodDays = [7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30;
    const requestedPaymentMethod = request.nextUrl.searchParams.get("paymentMethod") || undefined;
    const paymentMethod = requestedPaymentMethod && Object.values(PaymentMethod).includes(requestedPaymentMethod as PaymentMethod) ? requestedPaymentMethod as PaymentMethod : undefined;
    const category = request.nextUrl.searchParams.get("category") || undefined;
    const brand = request.nextUrl.searchParams.get("brand") || undefined;
    const now = new Date();
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - (periodDays - 1)); thirtyDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 6); sevenDaysAgo.setHours(0, 0, 0, 0);
    const [sales, products, pendingExpenses, recentExpenses] = await Promise.all([
      prisma.sale.findMany({ where: { tenantId, ...branchFilter, status: "COMPLETED", ...(paymentMethod ? { paymentMethod } : {}), soldAt: { gte: thirtyDaysAgo } }, include: { customer: { select: { name: true } }, items: true }, orderBy: { soldAt: "desc" } }),
      prisma.product.findMany({ where: { tenantId, status: "ACTIVE" }, select: { category: true, brand: true, branchStocks: { where: branchFilter, select: { stockQuantity: true, minStock: true } } } }),
      prisma.financialEntry.aggregate({ where: { tenantId, ...branchFilter, type: "EXPENSE", status: "PENDING" }, _sum: { amount: true } }),
      prisma.financialEntry.findMany({ where: { tenantId, ...branchFilter, type: "EXPENSE", status: "PAID", paidAt: { gte: sevenDaysAgo } }, orderBy: { paidAt: "asc" } })
    ]);
    const filteredSales = sales.map((sale) => ({ ...sale, items: sale.items.filter((item) => (!category || item.category === category) && (!brand || item.brand === brand)) })).filter((sale) => sale.items.length > 0 || (!category && !brand));
    const revenue = filteredSales.reduce((sum, sale) => sum + (category || brand ? sale.items.reduce((itemSum, item) => itemSum + number(item.total), 0) : number(sale.total)), 0);
    const cost = filteredSales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + number(item.costPrice) * number(item.quantity), 0), 0);
    const productTotals = new Map<string, number>();
    for (const sale of filteredSales) for (const item of sale.items) productTotals.set(item.description, (productTotals.get(item.description) ?? 0) + number(item.quantity));
    const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const cashFlow = Array.from({ length: 7 }, (_, offset) => { const date = new Date(sevenDaysAgo); date.setDate(sevenDaysAgo.getDate() + offset); const key = dayKey(date); return { day: date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }), revenue: filteredSales.filter((sale) => dayKey(sale.soldAt) === key).reduce((sum, sale) => sum + (category || brand ? sale.items.reduce((itemSum, item) => itemSum + number(item.total), 0) : number(sale.total)), 0), expense: recentExpenses.filter((entry) => entry.paidAt && dayKey(entry.paidAt) === key).reduce((sum, entry) => sum + number(entry.amount), 0) }; });
    const paymentLabels: Record<string, string> = { CASH: "Dinheiro", PIX: "Pix", CREDIT_CARD: "Cartão de crédito", DEBIT_CARD: "Cartão de débito", STORE_CREDIT: "Crédito da loja", VOUCHER: "Vale", MIXED: "Pagamento combinado" };
    const upcomingExpenses = await prisma.financialEntry.findMany({ where: { tenantId, ...branchFilter, type: "EXPENSE", status: "PENDING" }, orderBy: { dueDate: "asc" }, take: 5 });
    const lowStock = products.filter((product) => product.branchStocks.some((stock) => number(stock.minStock) > 0 && number(stock.stockQuantity) <= number(stock.minStock))).length;
    const filterOptions = { categories: Array.from(new Set(products.map((product) => product.category))).sort(), brands: Array.from(new Set(products.map((product) => product.brand).filter((value): value is string => Boolean(value)))).sort(), paymentMethods: Object.entries(paymentLabels).map(([value, label]) => ({ value, label })) };
    return ok({ metrics: { revenue, grossProfit: revenue - cost, margin: revenue ? ((revenue - cost) / revenue) * 100 : 0, pendingExpenses: number(pendingExpenses._sum.amount), lowStock }, cashFlow, topProducts: Array.from(productTotals, ([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 5), latestSales: filteredSales.slice(0, 5).map((sale) => ({ id: sale.id, code: sale.code, customerName: sale.customer?.name ?? "Consumidor final", paymentMethod: paymentLabels[sale.paymentMethod] ?? sale.paymentMethod, total: category || brand ? sale.items.reduce((sum, item) => sum + number(item.total), 0) : number(sale.total), soldAt: sale.soldAt.toISOString() })), upcomingExpenses: upcomingExpenses.map((entry) => ({ id: entry.id, description: entry.description, amount: number(entry.amount), dueDate: entry.dueDate.toISOString() })), filterOptions });
  } catch (error) { return errorResponse(error); }
}
