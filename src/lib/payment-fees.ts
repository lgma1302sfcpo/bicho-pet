export type PaymentDetails = {
  machine?: "STONE" | "OTHER";
  brand?: "MASTERCARD" | "VISA" | "ELO" | "AMEX";
  installments?: number;
  manualRate?: number;
  pixType?: "KEY" | "MACHINE";
};

export function paymentSelectionValue(method?: string, details?: PaymentDetails) {
  return method === "PIX" && details?.pixType === "MACHINE" ? "PIX_MACHINE" : method ?? "";
}

export function pixPaymentLabel(method: string, details?: PaymentDetails) {
  return method === "PIX" ? details?.pixType === "MACHINE" ? "Pix máquina" : "Pix chave" : method;
}

export const stoneRates = {
  MASTERCARD: { debit: 2.09, credit: [6.92, 7.73, 9.10, 10.48] },
  VISA: { debit: 2.09, credit: [6.92, 7.73, 9.10, 10.48] },
  ELO: { debit: 2.67, credit: [6.43, 8.26, 9.62, 10.99] },
  AMEX: { debit: null, credit: [6.55, 8.05, 9.42, 10.78, 12.15] }
} as const;

export function isCardPayment(method?: string) {
  return method === "CREDIT_CARD" || method === "DEBIT_CARD";
}

// Undefined means the rate is unknown, never an assumed zero rate.
export function paymentRate(method: string, details?: PaymentDetails): number | undefined {
  if (!isCardPayment(method)) return 0;
  if (!details?.machine) return undefined;
  if (details.machine === "OTHER") return details.manualRate;
  if (!details.brand) return undefined;
  const rates = stoneRates[details.brand];
  return method === "DEBIT_CARD"
    ? rates.debit ?? undefined
    : rates.credit[(details.installments ?? 1) - 1];
}

export function calculatePaymentFee(method: string, amount: number, details?: PaymentDetails) {
  const rate = paymentRate(method, details);
  const cents = Math.round(amount * 100);
  const feeCents = Math.round(cents * (rate ?? 0) / 100);
  return { rate, feeAmount: feeCents / 100, netAmount: (cents - feeCents) / 100 };
}

export function paymentSettlement(method: string, amount: number, details?: PaymentDetails) {
  if (!details || (!isCardPayment(method) && method !== "PIX")) return undefined;
  const calculation = calculatePaymentFee(method, amount, details);
  const metadata: Record<string, string | number> = {};
  const relevant = method === "PIX" ? { pixType: details.pixType } : {
    machine: details.machine, brand: details.brand,
    installments: method === "DEBIT_CARD" ? 1 : details.installments,
    manualRate: details.machine === "OTHER" ? details.manualRate : undefined
  };
  for (const [key, value] of Object.entries({ ...relevant, ...calculation })) {
    if (value !== undefined) metadata[key] = value;
  }
  return metadata;
}
