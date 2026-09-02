export type GroomingReminderInput = {
  customerName: string;
  petName: string;
  serviceName: string;
  professionalName: string;
  startAt: string | Date;
  phone?: string | null;
};

export function buildGroomingWhatsAppReminder(input: GroomingReminderInput) {
  const digits = (input.phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const startAt = new Date(input.startAt);
  const date = startAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const time = startAt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  const message = `Olá, ${input.customerName}! Lembramos do atendimento de ${input.petName}: ${input.serviceName}, dia ${date} às ${time}, com ${input.professionalName}. Pode confirmar o horário?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
