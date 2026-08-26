import type { CustomerListItemDTO } from "@/dtos/commerce/customer.dto";

export const WHATSAPP_MESSAGE_TYPES = [
  { value: "AUTOMATIC", label: "Sugestão automática" },
  { value: "REACTIVATION", label: "Reativação de cliente" },
  { value: "LOYALTY", label: "Agradecimento e fidelização" },
  { value: "BIRTHDAY", label: "Aniversário" },
  { value: "GENERAL", label: "Contato geral" }
] as const;

export type WhatsAppMessageType = (typeof WHATSAPP_MESSAGE_TYPES)[number]["value"];

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function automaticType(customer: CustomerListItemDTO): Exclude<WhatsAppMessageType, "AUTOMATIC"> {
  if (customer.purchaseCount === 0) return "GENERAL";
  if ((customer.daysSinceLastPurchase ?? 0) >= 30) return "REACTIVATION";
  return "LOYALTY";
}

export function buildCustomerWhatsAppMessage(
  customer: CustomerListItemDTO,
  requestedType: WhatsAppMessageType = "AUTOMATIC"
) {
  const name = firstName(customer.name);
  const type = requestedType === "AUTOMATIC" ? automaticType(customer) : requestedType;
  const days = customer.daysSinceLastPurchase;

  if (type === "REACTIVATION") {
    const history = days === null || days === undefined
      ? "Percebemos que faz um tempo que não nos visita"
      : `Já faz ${days} ${days === 1 ? "dia" : "dias"} desde sua última compra`;
    return `Olá, ${name}! Aqui é da Pet Shop Casa dos Bichos. ${history} e sentimos sua falta. Temos novidades para você e seu pet. Posso te mostrar?`;
  }

  if (type === "LOYALTY") {
    const purchases = customer.purchaseCount > 0
      ? `Você já realizou ${customer.purchaseCount} ${customer.purchaseCount === 1 ? "compra" : "compras"} conosco e agradecemos muito pela confiança.`
      : "Agradecemos pelo seu contato e pela confiança em nosso trabalho.";
    return `Olá, ${name}! Aqui é da Pet Shop Casa dos Bichos. ${purchases} Estamos à disposição para cuidar do seu pet. Precisa de alguma coisa?`;
  }

  if (type === "BIRTHDAY") {
    return `Olá, ${name}! A equipe da Pet Shop Casa dos Bichos deseja um feliz aniversário! Preparamos uma mensagem especial para celebrar esse dia com você. Posso te contar?`;
  }

  if (customer.purchaseCount === 0) {
    return `Olá, ${name}! Aqui é da Pet Shop Casa dos Bichos. Vimos que você ainda não fez sua primeira compra conosco. Será um prazer ajudar a encontrar o que seu pet precisa. Como podemos ajudar?`;
  }

  return `Olá, ${name}! Aqui é da Pet Shop Casa dos Bichos. Estamos entrando em contato para saber se você e seu pet precisam de alguma coisa. Como podemos ajudar?`;
}

export function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const number = normalizeWhatsAppNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message.trim())}`;
}
