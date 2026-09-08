import type { Prisma } from "@prisma/client";

import { calculateExpectedCash } from "@/lib/cash-register";

export const cashRegisterInclude = {
  openedBy: { select: { name: true } },
  closedBy: { select: { name: true } },
  reopenedBy: { select: { name: true } },
  movements: {
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" }
  },
  sales: { where: { status: { in: ["COMPLETED", "CANCELLED"] } }, select: { status: true, paymentMethod: true, total: true, payments: { select: { method: true, amount: true } } } }
} satisfies Prisma.CashRegisterSessionInclude;

type CashRegisterWithDetails = Prisma.CashRegisterSessionGetPayload<{ include: typeof cashRegisterInclude }>;

const number = (value: unknown) => Number(value ?? 0);

export function serializeCashRegister(item: CashRegisterWithDetails) {
  const movementTotals = item.movements.reduce(
    (acc, movement) => {
      const amount = number(movement.amount);
      if (movement.type === "CASH_SALE") acc.cashSales += amount;
      if (movement.type === "SUPPLY") acc.supplies += amount;
      if (movement.type === "WITHDRAWAL") acc.withdrawals += amount;
      return acc;
    },
    { cashSales: 0, supplies: 0, withdrawals: 0 }
  );
  const paymentBreakdown = item.sales.reduce((acc, sale) => {
    if (sale.status !== "COMPLETED") return acc;
    if (sale.payments.length) {
      sale.payments.forEach((payment) => { acc[payment.method] += number(payment.amount); });
    } else {
      acc[sale.paymentMethod] += number(sale.total);
    }
    return acc;
  }, { CASH: 0, PIX: 0, CREDIT_CARD: 0, DEBIT_CARD: 0, STORE_CREDIT: 0, VOUCHER: 0, MIXED: 0 });
  const totals = { cashSales: paymentBreakdown.CASH, supplies: movementTotals.supplies, withdrawals: movementTotals.withdrawals };
  const expectedAmount = item.status === "OPEN" || item.expectedClosingAmount == null
    ? calculateExpectedCash(number(item.openingAmount), totals)
    : number(item.expectedClosingAmount);

  return {
    id: item.id,
    status: item.status,
    openingAmount: number(item.openingAmount),
    ...totals,
    expectedAmount,
    actualAmount: item.actualClosingAmount == null ? null : number(item.actualClosingAmount),
    difference: item.difference == null ? null : number(item.difference),
    openingNotes: item.openingNotes,
    closingNotes: item.closingNotes,
    openedAt: item.openedAt.toISOString(),
    closedAt: item.closedAt?.toISOString() ?? null,
    openedByName: item.openedBy?.name ?? null,
    closedByName: item.closedBy?.name ?? null,
    reopenedAt: item.reopenedAt?.toISOString() ?? null,
    reopenedByName: item.reopenedBy?.name ?? null,
    reopenCount: item.reopenCount,
    salesCount: item.sales.length,
    paymentBreakdown,
    movements: item.movements.map((movement) => ({
      id: movement.id,
      type: movement.type,
      amount: number(movement.amount),
      description: movement.description,
      createdAt: movement.createdAt.toISOString(),
      userName: movement.user?.name ?? null
    }))
  };
}
