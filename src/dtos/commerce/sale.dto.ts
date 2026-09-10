import { z } from "zod";

import { createSaleSchema } from "@/schemas/commerce/sale.schemas";

export type CreateSaleDTO = z.infer<typeof createSaleSchema>;

export type SaleListItemDTO = {
  id: string;
  code: string;
  branchName: string;
  customerName?: string | null;
  paymentMethod: string;
  status: string;
  soldAt: string;
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  itemsCount: number;
  items: Array<{
    productId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    costPrice: number;
    total: number;
    category?: string | null;
    species?: string | null;
    brand?: string | null;
    supplier?: string | null;
  }>;
};

export type SaleCreatedDTO = {
  id: string;
  code: string;
  total: number;
  customerId?: string | null;
  fiscal?: { status: "AUTHORIZED" | "PENDING_CORRECTION" | "DISABLED" | "SKIPPED_SERVICE"; message: string; branchName?: string };
};
