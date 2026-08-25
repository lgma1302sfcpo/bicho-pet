import { PrismaProductRepository } from "@/repositories/catalog/prisma-product.repository";

import { ProductService } from "./product.service";

export const productService = new ProductService(new PrismaProductRepository());

export { ProductService };
