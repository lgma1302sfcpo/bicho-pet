import { PrismaIdentityRepository } from "@/repositories/identity/prisma-identity.repository";
import { bcryptPasswordHasher } from "@/lib/password";
import { ResendEmailSender } from "@/services/messaging/resend-email-sender";

import { IdentityService } from "./identity.service";

export const identityService = new IdentityService(
  new PrismaIdentityRepository(),
  bcryptPasswordHasher,
  new ResendEmailSender()
);

export { IdentityService };
