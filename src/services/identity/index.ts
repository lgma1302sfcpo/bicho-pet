import { PrismaIdentityRepository } from "@/repositories/identity/prisma-identity.repository";
import { bcryptPasswordHasher } from "@/lib/password";

import { IdentityService } from "./identity.service";

export const identityService = new IdentityService(
  new PrismaIdentityRepository(),
  bcryptPasswordHasher
);

export { IdentityService };
