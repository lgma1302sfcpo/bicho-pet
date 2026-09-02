export type CashMovementType = "CASH_SALE" | "SUPPLY" | "WITHDRAWAL";

export type CashRegisterMovement = {
  id: string;
  type: CashMovementType;
  amount: number;
  description: string;
  createdAt: string;
  userName: string | null;
};

export type CashRegisterReport = {
  id: string;
  status: "OPEN" | "CLOSED";
  openingAmount: number;
  cashSales: number;
  supplies: number;
  withdrawals: number;
  expectedAmount: number;
  actualAmount: number | null;
  difference: number | null;
  openingNotes: string | null;
  closingNotes: string | null;
  openedAt: string;
  closedAt: string | null;
  openedByName: string | null;
  closedByName: string | null;
  reopenedAt: string | null;
  reopenedByName: string | null;
  reopenCount: number;
  salesCount: number;
  paymentBreakdown: Record<"CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "STORE_CREDIT" | "VOUCHER" | "MIXED", number>;
  movements: CashRegisterMovement[];
};

export type CashRegisterData = {
  current: CashRegisterReport | null;
  history: CashRegisterReport[];
};
