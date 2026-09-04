import { z } from "zod";

import { createCustomerSchema, customerFiltersSchema, updateCustomerSchema } from "@/schemas/commerce/customer.schemas";

export type CreateCustomerDTO = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerDTO = z.infer<typeof updateCustomerSchema>;
export type CustomerFiltersDTO = z.infer<typeof customerFiltersSchema>;

export type CustomerPetDTO = {
  id?: string;
  name: string;
  species: "DOG" | "CAT";
  sex: "MALE" | "FEMALE";
  breed?: string | null;
  birthDate?: string | Date | null;
  notes?: string | null;
};

export type CustomerListItemDTO = {
  id: string;
  branchId?: string | null;
  branchName?: string | null;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  birthDate?: string | null;
  address?: string | null;
  street?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  cityCode?: string | null;
  state?: string | null;
  zipCode?: string | null;
  stateRegistration?: string | null;
  notes?: string | null;
  tags: string[];
  status: string;
  lastPurchaseAt?: string | null;
  daysSinceLastPurchase?: number | null;
  purchaseCount: number;
  totalSpent: number;
  creditLimit: number;
  reactivationLabel: string;
  pets: CustomerPetDTO[];
};

export type CustomerEngagementSummaryDTO = {
  totalCustomers: number;
  neverPurchased: number;
  inactive30: number;
  inactive60: number;
  inactive90: number;
  totalFiltered: number;
};
