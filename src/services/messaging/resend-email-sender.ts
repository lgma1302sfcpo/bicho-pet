import type { EmailSender, SendEmailInput } from "@/interfaces/messaging/email-sender.interface";
import { AppError } from "@/lib/errors";

export class ResendEmailSender implements EmailSender {
  async send(input: SendEmailInput) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
      throw new AppError(
        "O envio por e-mail não está disponível. Copie o link e compartilhe pelo WhatsApp.",
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
      throw new AppError("Não foi possível enviar o e-mail agora. Tente novamente mais tarde.", "EMAIL_SEND_FAILED", 502);
    }

    return { id: body.id };
  }
}
