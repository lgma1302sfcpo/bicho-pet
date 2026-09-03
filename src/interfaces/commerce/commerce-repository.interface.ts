import type {
  CreateCustomerDTO,
  CustomerFiltersDTO,
  UpdateCustomerDTO
} from "@/dtos/commerce/customer.dto";
import type { CreateSaleDTO } from "@/dtos/commerce/sale.dto";

export type CustomerRecord = {
  id: string;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  birthDate?: Date | null;
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
  lastPurchaseAt?: Date | null;
  purchaseCount: number;
  totalSpent: number;
  creditLimit: number;
  pets: Array<{
    id: string;
    name: string;
    species: "DOG" | "CAT";
    sex: "MALE" | "FEMALE";
    breed?: string | null;
    birthDate?: Date | null;
    notes?: string | null;
  }>;
};

export type CustomerSummaryRecord = {
  totalCustomers: number;
  neverPurchased: number;
  inactive30: number;
  inactive60: number;
  inactive90: number;
};

export type SaleRecord = {
  id: string;
  code: string;
  branchName: string;
  customerName?: string | null;
  paymentMethod: string;
  status: string;
  soldAt: Date;
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

export interface CommerceRepository {
  customerDocumentExists(tenantId: string, document: string, excludeCustomerId?: string): Promise<boolean>;
  customerBelongsToTenant(tenantId: string, customerId: string): Promise<boolean>;
  findCustomerById(tenantId: string, customerId: string): Promise<CustomerRecord | null>;
  createCustomer(tenantId: string, data: CreateCustomerDTO): Promise<CustomerRecord>;
  updateCustomer(tenantId: string, customerId: string, data: UpdateCustomerDTO): Promise<CustomerRecord | null>;
  deleteCustomer(tenantId: string, customerId: string): Promise<boolean>;
  listCustomers(tenantId: string, filters: CustomerFiltersDTO): Promise<CustomerRecord[]>;
  getCustomerSummary(tenantId: string): Promise<CustomerSummaryRecord>;
  createSale(data: {
    tenantId: string;
    branchId: string;
    userId: string;
    code: string;
    sale: CreateSaleDTO;
    subtotal: number;
    total: number;
  }): Promise<{ id: string; code: string; total: number; customerId?: string | null }>;
  listSales(tenantId: string, branchId: string | null): Promise<SaleRecord[]>;
}
