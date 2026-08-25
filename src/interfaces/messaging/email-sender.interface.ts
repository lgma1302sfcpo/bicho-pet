export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
  attachments?: Array<{
    filename: string;
    content: string;
  }>;
};

export interface EmailSender {
  send(input: SendEmailInput): Promise<{ id: string }>;
}
