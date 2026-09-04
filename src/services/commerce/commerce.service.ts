import type {
  CreateCustomerDTO,
  CustomerEngagementSummaryDTO,
  CustomerFiltersDTO,
  CustomerListItemDTO,
  UpdateCustomerDTO
} from "@/dtos/commerce/customer.dto";
import type { CreateSaleDTO, SaleCreatedDTO, SaleListItemDTO } from "@/dtos/commerce/sale.dto";
import type { CommerceRepository, CustomerRecord } from "@/interfaces/commerce/commerce-repository.interface";
import { AppError } from "@/lib/errors";

export class CommerceService {
  constructor(private readonly repository: CommerceRepository) {}

  async createCustomer(tenantId: string, branchId: string, input: CreateCustomerDTO): Promise<CustomerListItemDTO> {
    if (input.document) {
      const exists = await this.repository.customerDocumentExists(tenantId, branchId, input.document);

      if (exists) {
        throw new AppError("Já existe um cliente com este documento.", "CUSTOMER_DOCUMENT_EXISTS", 409);
      }
    }

    const customer = await this.repository.createCustomer(tenantId, branchId, {
      ...input,
      email: input.email || undefined
    });

    return this.mapCustomer(customer);
  }

  async listCustomers(tenantId: string, branchId: string | null, filters: CustomerFiltersDTO) {
    const [customers, summary] = await Promise.all([
      this.repository.listCustomers(tenantId, branchId, filters),
      this.repository.getCustomerSummary(tenantId, branchId)
    ]);

    return {
      customers: customers.map((customer) => this.mapCustomer(customer)),
      summary: {
        ...summary,
        totalFiltered: customers.length
      } satisfies CustomerEngagementSummaryDTO
    };
  }

  async updateCustomer(tenantId: string, branchId: string, customerId: string, input: UpdateCustomerDTO): Promise<CustomerListItemDTO> {
    if (input.document) {
      const exists = await this.repository.customerDocumentExists(tenantId, branchId, input.document, customerId);

      if (exists) {
        throw new AppError("Já existe um cliente com este documento.", "CUSTOMER_DOCUMENT_EXISTS", 409);
      }
    }

    const customer = await this.repository.updateCustomer(tenantId, branchId, customerId, {
      ...input,
      email: input.email || undefined
    });

    if (!customer) {
      throw new AppError("Cliente não encontrado.", "CUSTOMER_NOT_FOUND", 404);
    }

    return this.mapCustomer(customer);
  }

  async deleteCustomer(tenantId: string, branchId: string, customerId: string) {
    const deleted = await this.repository.deleteCustomer(tenantId, branchId, customerId);

    if (!deleted) {
      throw new AppError("Cliente não encontrado.", "CUSTOMER_NOT_FOUND", 404);
    }
  }

  async createSale(tenantId: string, branchId: string, userId: string, input: CreateSaleDTO): Promise<SaleCreatedDTO> {
    const customerId = input.customerId || undefined;

    if (customerId) {
      const belongsToBranch = await this.repository.customerBelongsToBranch(tenantId, branchId, customerId);

      if (!belongsToBranch) {
        throw new AppError("Cliente inválido para esta loja.", "CUSTOMER_NOT_FOUND", 404);
      }
    }

    const subtotal = this.roundMoney(
      input.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
    );
    const invalidItemDiscount = input.items.find((item) => item.discount > this.roundMoney(item.quantity * item.unitPrice));
    if (invalidItemDiscount) {
      throw new AppError(`O desconto de ${invalidItemDiscount.description} não pode ser maior que o valor do item.`, "INVALID_SALE_ITEM_DISCOUNT", 422);
    }
    const itemDiscountTotal = this.roundMoney(input.items.reduce((total, item) => total + item.discount, 0));
    if (input.discount < itemDiscountTotal) {
      throw new AppError("O desconto total da venda não confere com os descontos dos itens.", "INVALID_SALE_DISCOUNT", 422);
    }
    const total = this.roundMoney(subtotal - input.discount + input.surcharge);

    if (total < 0) {
      throw new AppError("O total da venda não pode ser negativo.", "INVALID_SALE_TOTAL", 422);
    }

    return this.repository.createSale({
      tenantId,
      branchId,
      userId,
      code: this.createSaleCode(),
      sale: {
        ...input,
        customerId
      },
      subtotal,
      total
    });
  }

  async listSales(tenantId: string, branchId: string | null): Promise<SaleListItemDTO[]> {
    const sales = await this.repository.listSales(tenantId, branchId);

    return sales.map((sale) => ({
      id: sale.id,
      code: sale.code,
      branchName: sale.branchName,
      customerName: sale.customerName,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      soldAt: sale.soldAt.toISOString(),
      subtotal: sale.subtotal,
      discount: sale.discount,
      surcharge: sale.surcharge,
      total: sale.total,
      itemsCount: sale.itemsCount,
      items: sale.items
    }));
  }

  private mapCustomer(customer: CustomerRecord): CustomerListItemDTO {
    const daysSinceLastPurchase = customer.lastPurchaseAt
      ? Math.floor((Date.now() - customer.lastPurchaseAt.getTime()) / 86_400_000)
      : null;

    return {
      id: customer.id,
      branchId: customer.branchId,
      branchName: customer.branchName,
      name: customer.name,
      document: customer.document,
      email: customer.email,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      birthDate: customer.birthDate?.toISOString() ?? null,
      address: customer.address,
      street: customer.street,
      addressNumber: customer.addressNumber,
      complement: customer.complement,
      district: customer.district,
      city: customer.city,
      cityCode: customer.cityCode,
      state: customer.state,
      zipCode: customer.zipCode,
      stateRegistration: customer.stateRegistration,
      notes: customer.notes,
      tags: customer.tags,
      status: customer.status,
      lastPurchaseAt: customer.lastPurchaseAt?.toISOString() ?? null,
      daysSinceLastPurchase,
      purchaseCount: customer.purchaseCount,
      totalSpent: customer.totalSpent,
      creditLimit: customer.creditLimit,
      pets: customer.pets.map((pet) => ({
        ...pet,
        birthDate: pet.birthDate?.toISOString() ?? null
      })),
      reactivationLabel: this.getReactivationLabel(daysSinceLastPurchase, customer.purchaseCount)
    };
  }

  private getReactivationLabel(daysSinceLastPurchase: number | null, purchaseCount: number) {
    if (purchaseCount === 0) {
      return "Nunca comprou";
    }

    if (daysSinceLastPurchase === null) {
      return "Sem histórico";
    }

    if (daysSinceLastPurchase >= 90) {
      return "Prioridade alta";
    }

    if (daysSinceLastPurchase >= 60) {
      return "Enviar cupom forte";
    }

    if (daysSinceLastPurchase >= 30) {
      return "Enviar lembrete";
    }

    return "Cliente ativo";
  }

  private createSaleCode() {
    return `VD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString(36).toUpperCase()}`;
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }
}
