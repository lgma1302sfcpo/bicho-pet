export type CashRegisterTotals = {
  cashSales: number;
  supplies: number;
  withdrawals: number;
};

export function calculateExpectedCash(openingAmount: number, totals: CashRegisterTotals) {
  return Math.round((openingAmount + totals.cashSales + totals.supplies - totals.withdrawals) * 100) / 100;
}

export function calculateCashDifference(actualAmount: number, expectedAmount: number) {
  return Math.round((actualAmount - expectedAmount) * 100) / 100;
}

