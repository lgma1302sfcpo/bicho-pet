import type { CommerceRepository } from "@/interfaces/commerce/commerce-repository.interface";
import type { EmailSender } from "@/interfaces/messaging/email-sender.interface";
import { AppError } from "@/lib/errors";
import type { SendCustomerEmailInput } from "@/schemas/messaging/email.schemas";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export class CustomerEmailService {
  constructor(
    private readonly repository: CommerceRepository,
    private readonly sender: EmailSender
  ) {}

  async sendToCustomer(tenantId: string, customerId: string, input: SendCustomerEmailInput) {
    const customer = await this.repository.findCustomerById(tenantId, customerId);
    if (!customer) {
      throw new AppError("Cliente não encontrado.", "CUSTOMER_NOT_FOUND", 404);
    }
    if (!customer.email) {
      throw new AppError("Este cliente não possui e-mail cadastrado.", "CUSTOMER_WITHOUT_EMAIL", 422);
    }

    const safeMessage = escapeHtml(input.message).replaceAll("\n", "<br />");
    const result = await this.sender.send({
      to: customer.email,
      subject: input.subject,
      text: input.message,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17202a"><p>Ola, ${escapeHtml(customer.name)}!</p><p>${safeMessage}</p></div>`,
      idempotencyKey: `customer-${customerId}-${crypto.randomUUID()}`
    });

    return { id: result.id, to: customer.email };
  }
}
