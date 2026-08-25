import { PrismaCommerceRepository } from "@/repositories/commerce/prisma-commerce.repository";

import { CommerceService } from "./commerce.service";

export const commerceService = new CommerceService(new PrismaCommerceRepository());

export { CommerceService };
