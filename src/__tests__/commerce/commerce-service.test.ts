import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CommerceRepository } from "@/interfaces/commerce/commerce-repository.interface";
import { CommerceService } from "@/services/commerce/commerce.service";

function createRepositoryMock(): CommerceRepository {
  return {
    customerDocumentExists: vi.fn(),
    customerBelongsToBranch: vi.fn(),
    findCustomerById: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
    listCustomers: vi.fn(),
    getCustomerSummary: vi.fn(),
    createSale: vi.fn(),
    listSales: vi.fn()
  };
}

describe("CommerceService", () => {
  let repository: CommerceRepository;
  let service: CommerceService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new CommerceService(repository);
    vi.clearAllMocks();
  });

  it("classifica cliente sem compra como nunca comprou", async () => {
    vi.mocked(repository.listCustomers).mockResolvedValue([
      {
        id: "customer-1",
        name: "Cliente sem compra",
        tags: [],
        status: "ACTIVE",
        purchaseCount: 0,
        totalSpent: 0,
        creditLimit: 0,
        pets: [],
        lastPurchaseAt: null
      }
    ]);
    vi.mocked(repository.getCustomerSummary).mockResolvedValue({
      totalCustomers: 1,
      neverPurchased: 1,
      inactive30: 0,
      inactive60: 0,
      inactive90: 0
    });

    const result = await service.listCustomers("tenant-1", "branch-1", {
      inactiveDays: 60,
      includeNeverPurchased: true,
      contactableOnly: false
    });

    expect(result.customers[0].reactivationLabel).toBe("Nunca comprou");
    expect(result.summary.totalFiltered).toBe(1);
    expect(repository.listCustomers).toHaveBeenCalledWith("tenant-1", "branch-1", expect.any(Object));
    expect(repository.getCustomerSummary).toHaveBeenCalledWith("tenant-1", "branch-1");
  });

  it("classifica cliente ha 90 dias sem comprar como prioridade alta", async () => {
    vi.mocked(repository.listCustomers).mockResolvedValue([
      {
        id: "customer-1",
        name: "Cliente antigo",
        tags: ["vip"],
        status: "ACTIVE",
        purchaseCount: 5,
        totalSpent: 950,
        creditLimit: 0,
        pets: [],
        lastPurchaseAt: new Date(Date.now() - 95 * 86_400_000)
      }
    ]);
    vi.mocked(repository.getCustomerSummary).mockResolvedValue({
      totalCustomers: 1,
      neverPurchased: 0,
      inactive30: 1,
      inactive60: 1,
      inactive90: 1
    });

    const result = await service.listCustomers("tenant-1", "branch-1", {
      inactiveDays: 90,
      includeNeverPurchased: false,
      contactableOnly: false
    });

    expect(result.customers[0].reactivationLabel).toBe("Prioridade alta");
    expect(result.customers[0].daysSinceLastPurchase).toBeGreaterThanOrEqual(90);
  });

  it("calcula total da venda e delega persistencia", async () => {
    vi.mocked(repository.customerBelongsToBranch).mockResolvedValue(true);
    vi.mocked(repository.createSale).mockResolvedValue({
      id: "sale-1",
      code: "VD-1",
      total: 45,
      customerId: "customer-1"
    });

    const result = await service.createSale("tenant-1", "branch-1", "user-1", {
      customerId: "customer-1",
      paymentMethod: "PIX",
      discount: 5,
      surcharge: 0,
      items: [
        { description: "Banho", quantity: 1, unitPrice: 40, discount: 5 },
        { description: "Petisco", quantity: 2, unitPrice: 5, discount: 0 }
      ]
    });

    expect(repository.createSale).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: 50,
        total: 45
      })
    );
    expect(repository.customerBelongsToBranch).toHaveBeenCalledWith("tenant-1", "branch-1", "customer-1");
    expect(result.total).toBe(45);
  });

  it("calcula venda fracionada por quilograma", async () => {
    vi.mocked(repository.createSale).mockResolvedValue({ id: "sale-granel", code: "VD-GRANEL", total: 7.05 });

    await service.createSale("tenant-1", "branch-1", "user-1", {
      paymentMethod: "PIX",
      discount: 0,
      surcharge: 0,
      items: [{ productId: "racao-granel", description: "Racao a granel", quantity: 0.3, unitPrice: 23.5, discount: 0 }]
    });

    expect(repository.createSale).toHaveBeenCalledWith(expect.objectContaining({ subtotal: 7.05, total: 7.05 }));
  });

  it("impede desconto maior que o valor do item", async () => {
    await expect(service.createSale("tenant-1", "branch-1", "user-1", {
      paymentMethod: "PIX",
      discount: 11,
      surcharge: 0,
      items: [{ description: "Petisco", quantity: 1, unitPrice: 10, discount: 11 }]
    })).rejects.toMatchObject({ code: "INVALID_SALE_ITEM_DISCOUNT" });
  });

  it("bloqueia venda para cliente de outra loja", async () => {
    vi.mocked(repository.customerBelongsToBranch).mockResolvedValue(false);

    await expect(
      service.createSale("tenant-1", "branch-1", "user-1", {
        customerId: "customer-2",
        paymentMethod: "PIX",
        discount: 0,
        surcharge: 0,
        items: [{ description: "Banho", quantity: 1, unitPrice: 40, discount: 0 }]
      })
    ).rejects.toMatchObject({ code: "CUSTOMER_NOT_FOUND" });
  });

  it("edita cliente sem considerar o proprio documento como duplicado", async () => {
    vi.mocked(repository.customerDocumentExists).mockResolvedValue(false);
    vi.mocked(repository.updateCustomer).mockResolvedValue({
      id: "customer-1",
      name: "Cliente Editado",
      document: "12345678901",
      email: "cliente@example.invalid",
      tags: ["vip"],
      status: "ACTIVE",
      purchaseCount: 0,
      totalSpent: 0,
      creditLimit: 100,
      pets: []
    });

    const result = await service.updateCustomer("tenant-1", "branch-1", "customer-1", {
      name: "Cliente Editado",
      document: "12345678901",
      email: "cliente@example.invalid",
      creditLimit: 100,
      tags: ["vip"],
      pets: [],
      status: "ACTIVE"
    });

    expect(repository.customerDocumentExists).toHaveBeenCalledWith("tenant-1", "branch-1", "12345678901", "customer-1");
    expect(result.name).toBe("Cliente Editado");
  });

  it("informa quando o cliente a excluir nao existe", async () => {
    vi.mocked(repository.deleteCustomer).mockResolvedValue(false);
    await expect(service.deleteCustomer("tenant-1", "branch-1", "missing")).rejects.toMatchObject({
      code: "CUSTOMER_NOT_FOUND"
    });
  });
});
