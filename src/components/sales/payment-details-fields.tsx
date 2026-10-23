"use client";

import { Select } from "@/components/ui/select";
import { calculatePaymentFee, isCardPayment, stoneRates, type PaymentDetails } from "@/lib/payment-fees";

export function PaymentDetailsFields({ method, amount, value = {}, onChange, error }: {
  method?: string;
  amount: number;
  value?: PaymentDetails;
  onChange: (value: PaymentDetails) => void;
  error?: string;
}) {
  if (method !== "PIX" && !isCardPayment(method)) return null;
  const calculation = calculatePaymentFee(method!, amount, value);
  const currency = (number: number) => number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const maxInstallments = value.machine === "STONE" && value.brand ? stoneRates[value.brand].credit.length : 12;

  return <div className="space-y-3 rounded-lg border border-border bg-slate-50 p-3">
    {method === "PIX" ? <>
      <Select label="Tipo de Pix" value={value.pixType ?? ""} onChange={(event) => onChange({ pixType: event.target.value as PaymentDetails["pixType"] })}>
        <option value="">Selecione o tipo de Pix</option>
        <option value="KEY">Pix chave</option>
        <option value="MACHINE">Pix máquina</option>
      </Select>
      <p className="text-xs text-subdued">Sem taxa de Pix cadastrada.</p>
    </> : <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Maquininha" value={value.machine ?? ""} onChange={(event) => onChange({ machine: event.target.value as PaymentDetails["machine"], installments: 1 })}>
          <option value="">Selecione a maquininha</option>
          <option value="STONE">Stone</option>
        </Select>
        <Select label="Bandeira" value={value.brand ?? ""} onChange={(event) => onChange({ ...value, brand: event.target.value as PaymentDetails["brand"], installments: 1 })}>
          <option value="">Selecione a bandeira</option>
          <option value="MASTERCARD">Mastercard</option><option value="VISA">Visa</option><option value="ELO">Elo</option><option value="AMEX">Amex</option>
        </Select>
        {method === "CREDIT_CARD" ? <Select label="Parcelas" value={value.installments ?? 1} onChange={(event) => onChange({ ...value, installments: Number(event.target.value) })}>
          {Array.from({ length: maxInstallments }, (_, index) => <option key={index + 1} value={index + 1}>{index === 0 ? "À vista (1x)" : `${index + 1}x`}</option>)}
        </Select> : null}
      </div>
      {value.machine === "STONE" ? <p className="text-xs text-subdued">Taxas Stone para recebimento no mesmo dia. Parcelas disponíveis conforme as taxas informadas.</p> : null}
      {calculation.rate === undefined ? <p className="text-sm text-amber-800">Selecione os dados com taxa disponível para calcular o líquido.</p> : <p className="text-sm">Taxa: <strong>{calculation.rate.toLocaleString("pt-BR")}% ({currency(calculation.feeAmount)})</strong> · Líquido: <strong>{currency(calculation.netAmount)}</strong></p>}
    </>}
    {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
  </div>;
}
