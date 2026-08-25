import { z } from "zod";

export const sendCustomerEmailSchema = z.object({
  subject: z.string().trim().min(3, "Informe o assunto.").max(160, "Assunto muito longo."),
  message: z.string().trim().min(3, "Informe a mensagem.").max(10_000, "Mensagem muito longa.")
});

export type SendCustomerEmailInput = z.infer<typeof sendCustomerEmailSchema>;
