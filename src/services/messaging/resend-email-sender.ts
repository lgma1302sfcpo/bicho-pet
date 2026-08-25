import type { EmailSender, SendEmailInput } from "@/interfaces/messaging/email-sender.interface";
import { AppError } from "@/lib/errors";

export class ResendEmailSender implements EmailSender {
  async send(input: SendEmailInput) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
      throw new AppError(
        "Envio de email ainda nao foi configurado. Informe RESEND_API_KEY e EMAIL_FROM.",
        "EMAIL_NOT_CONFIGURED",
        503
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": input.idempotencyKey
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html
        ,attachments: input.attachments
      })
    });

    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok || !body.id) {
      throw new AppError(body.message ?? "O provedor recusou o envio do email.", "EMAIL_SEND_FAILED", 502);
    }

    return { id: body.id };
  }
}
