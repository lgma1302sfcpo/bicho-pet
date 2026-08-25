import { PrismaCommerceRepository } from "@/repositories/commerce/prisma-commerce.repository";

import { CustomerEmailService } from "./customer-email.service";
import { ResendEmailSender } from "./resend-email-sender";

export const customerEmailService = new CustomerEmailService(
  new PrismaCommerceRepository(),
  new ResendEmailSender()
);

export { CustomerEmailService };
