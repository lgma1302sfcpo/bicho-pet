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

export type PaymentMethod = "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "STORE_CREDIT" | "VOUCHER" | "MIXED";

export type CashSaleTransaction = {
  id: string;
  code: string;
  soldAt: string;
  paymentMethod: PaymentMethod;
  payments: Array<{ method: PaymentMethod; amount: number }>;
  status: "COMPLETED" | "CANCELLED";
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  notes: string | null;
  customerName: string | null;
  userName: string | null;
  cancelledAt: string | null;
  cancelledByName: string | null;
  cancellationReason: string | null;
  items: Array<{ id: string; description: string; quantity: number; unitPrice: number; discount: number; total: number; unit: string | null }>;
  corrections: Array<{ id: string; oldPaymentMethod: PaymentMethod; newPaymentMethod: PaymentMethod; reason: string; createdAt: string; correctedByName: string | null }>;
};

export type CashTransactionsData = {
  cashRegisterId: string;
  status: "OPEN" | "CLOSED";
  total: number;
  sales: CashSaleTransaction[];
};
