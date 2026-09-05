import { FaCreditCard, FaHandHoldingDollar, FaMoneyBillTransfer, FaMoneyBillWave, FaPix, FaRegCreditCard, FaTicketSimple } from "react-icons/fa6";

import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/cash-register";

const styles: Record<PaymentMethod, string> = {
  CASH: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PIX: "border-teal-200 bg-teal-50 text-teal-700",
  CREDIT_CARD: "border-violet-200 bg-violet-50 text-violet-700",
  DEBIT_CARD: "border-blue-200 bg-blue-50 text-blue-700",
  STORE_CREDIT: "border-amber-200 bg-amber-50 text-amber-700",
  VOUCHER: "border-rose-200 bg-rose-50 text-rose-700",
  MIXED: "border-slate-300 bg-slate-100 text-slate-700"
};

export function PaymentMethodIcon({ method, compact = false }: { method: PaymentMethod; compact?: boolean }) {
  const iconClass = compact ? "h-[18px] w-[18px]" : "h-6 w-6";
  const Icon = method === "CASH" ? FaMoneyBillWave
    : method === "PIX" ? FaPix
    : method === "CREDIT_CARD" ? FaCreditCard
    : method === "DEBIT_CARD" ? FaRegCreditCard
    : method === "STORE_CREDIT" ? FaHandHoldingDollar
    : method === "VOUCHER" ? FaTicketSimple
    : FaMoneyBillTransfer;

  return <span className={cn("grid shrink-0 place-items-center rounded-lg border", compact ? "h-8 w-8" : "h-11 w-11", styles[method])}>
    <Icon className={iconClass}/>
  </span>;
}
