import type { Prisma, PrismaClient } from "@prisma/client";

import type { CreateCustomerDTO, CustomerFiltersDTO, UpdateCustomerDTO } from "@/dtos/commerce/customer.dto";
import type { CommerceRepository } from "@/interfaces/commerce/commerce-repository.interface";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0);
}

type CustomerWithPets = Prisma.CustomerGetPayload<{ include: { pets: true; branch: { select: { name: true } } } }>;

export class PrismaCommerceRepository implements CommerceRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async customerDocumentExists(tenantId: string, branchId: string, document: string, excludeCustomerId?: string) {
    const count = await this.db.customer.count({
      where: {
        tenantId,
        branchId,
        document,
        ...(excludeCustomerId ? { id: { not: excludeCustomerId } } : {})
      }
    });

    return count > 0;
  }

  async customerBelongsToBranch(tenantId: string, branchId: string, customerId: string) {
    const count = await this.db.customer.count({
      where: {
        tenantId,
        branchId,
        id: customerId
      }
    });

    return count > 0;
  }

  async findCustomerById(tenantId: string, branchId: string | null, customerId: string) {
    const customer = await this.db.customer.findFirst({ where: { id: customerId, tenantId, ...(branchId ? { branchId } : {}) }, include: { pets: true, branch: { select: { name: true } } } });
    return customer ? this.mapCustomer(customer) : null;
  }

  async createCustomer(tenantId: string, branchId: string, data: CreateCustomerDTO) {
    const customer = await this.db.customer.create({
      data: {
        tenantId,
        branchId,
        name: data.name,
        document: data.document,
        email: data.email || undefined,
        phone: data.phone,
        whatsapp: data.whatsapp,
        birthDate: data.birthDate,
        address: data.address,
        street: data.street,
        addressNumber: data.addressNumber,
        complement: data.complement,
        district: data.district,
        city: data.city,
        cityCode: data.cityCode,
        state: data.state,
        zipCode: data.zipCode,
        stateRegistration: data.stateRegistration,
        creditLimit: data.creditLimit,
        notes: data.notes,
        tags: data.tags,
        pets: data.pets.length ? {
          create: data.pets.map((pet) => ({
            name: pet.name,
            species: pet.species,
            sex: pet.sex,
            breed: pet.breed,
            birthDate: pet.birthDate,
            notes: pet.notes
          }))
        } : undefined
      },
      include: { pets: true, branch: { select: { name: true } } }
    });

    return this.mapCustomer(customer);
  }

  async updateCustomer(tenantId: string, branchId: string, customerId: string, data: UpdateCustomerDTO) {
    const customer = await this.db.$transaction(async (tx) => {
      const updated = await tx.customer.updateMany({
        where: { id: customerId, tenantId, branchId },
        data: {
          name: data.name,
          document: data.document ?? null,
          email: data.email || null,
          phone: data.phone ?? null,
          whatsapp: data.whatsapp ?? null,
          birthDate: data.birthDate ?? null,
          address: data.address ?? null,
          street: data.street ?? null,
          addressNumber: data.addressNumber ?? null,
          complement: data.complement ?? null,
          district: data.district ?? null,
          city: data.city ?? null,
          cityCode: data.cityCode ?? null,
          state: data.state ?? null,
          zipCode: data.zipCode ?? null,
          stateRegistration: data.stateRegistration ?? null,
          creditLimit: data.creditLimit,
          notes: data.notes ?? null,
          tags: data.tags,
          status: data.status
        }
      });

      if (updated.count === 0) return null;

      await tx.pet.deleteMany({ where: { customerId } });
      if (data.pets.length) {
        await tx.pet.createMany({
          data: data.pets.map((pet) => ({
            customerId,
            name: pet.name,
            species: pet.species,
            sex: pet.sex,
            breed: pet.breed,
            birthDate: pet.birthDate,
            notes: pet.notes
          }))
        });
      }

      return tx.customer.findFirst({ where: { id: customerId, tenantId, branchId }, include: { pets: true, branch: { select: { name: true } } } });
    });
    return customer ? this.mapCustomer(customer) : null;
  }

  async deleteCustomer(tenantId: string, branchId: string, customerId: string) {
    const deleted = await this.db.customer.deleteMany({ where: { id: customerId, tenantId, branchId } });
    return deleted.count > 0;
  }

  async listCustomers(tenantId: string, branchId: string | null, filters: CustomerFiltersDTO) {
    const and: Prisma.CustomerWhereInput[] = [{ tenantId }, ...(branchId ? [{ branchId }] : [])];

    if (filters.status) {
      and.push({ status: filters.status });
    }

    if (filters.unassignedOnly) {
      and.push({ branchId: null });
    }

    if (filters.search) {
      and.push({
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { phone: { contains: filters.search } },
          { whatsapp: { contains: filters.search } },
          { document: { contains: filters.search } }
        ]
      });
    }

    if (filters.inactiveDays) {
      const cutoff = new Date(Date.now() - filters.inactiveDays * 86_400_000);
      and.push({
        OR: [
          { purchaseCount: { gt: 0 }, lastPurchaseAt: { lte: cutoff } },
          ...(filters.includeNeverPurchased ? [{ purchaseCount: 0 }] : [])
        ]
      });
    }

    if (filters.contactableOnly) {
      and.push({
        OR: [
          { whatsapp: { not: null } }
        ]
      });
    }

    if (filters.minTotalSpent !== undefined || filters.maxTotalSpent !== undefined) {
      and.push({
        totalSpent: {
          gte: filters.minTotalSpent,
          lte: filters.maxTotalSpent
        }
      });
    }

    if (filters.minPurchaseCount !== undefined || filters.maxPurchaseCount !== undefined) {
      and.push({
        purchaseCount: {
          gte: filters.minPurchaseCount,
          lte: filters.maxPurchaseCount
        }
      });
    }

    if (filters.tag) {
      and.push({ tags: { has: filters.tag } });
    }

    const customers = await this.db.customer.findMany({
      where: { AND: and },
      include: { pets: true, branch: { select: { name: true } } },
      orderBy: [{ lastPurchaseAt: "asc" }, { name: "asc" }],
      take: 200
    });

    return customers
      .filter((customer) => {
        if (!filters.birthdayMonth || !customer.birthDate) {
          return true;
        }

        return customer.birthDate.getUTCMonth() + 1 === filters.birthdayMonth;
      })
      .map((customer) => this.mapCustomer(customer));
  }

  async getCustomerSummary(tenantId: string, branchId: string | null) {
    const now = Date.now();
    const cutoff30 = new Date(now - 30 * 86_400_000);
    const cutoff60 = new Date(now - 60 * 86_400_000);
    const cutoff90 = new Date(now - 90 * 86_400_000);

    const scope = { tenantId, ...(branchId ? { branchId } : {}) };
    const [totalCustomers, neverPurchased, inactive30, inactive60, inactive90] = await Promise.all([
      this.db.customer.count({ where: scope }),
      this.db.customer.count({ where: { ...scope, purchaseCount: 0 } }),
      this.db.customer.count({ where: { ...scope, purchaseCount: { gt: 0 }, lastPurchaseAt: { lte: cutoff30 } } }),
      this.db.customer.count({ where: { ...scope, purchaseCount: { gt: 0 }, lastPurchaseAt: { lte: cutoff60 } } }),
      this.db.customer.count({ where: { ...scope, purchaseCount: { gt: 0 }, lastPurchaseAt: { lte: cutoff90 } } })
    ]);

    return {
      totalCustomers,
      neverPurchased,
      inactive30,
      inactive60,
      inactive90
    };
  }

  async createSale(data: {
    tenantId: string;
    branchId: string;
    userId: string;
    code: string;
    sale: import("@/dtos/commerce/sale.dto").CreateSaleDTO;
    subtotal: number;
    total: number;
  }) {
    return this.db.$transaction(async (tx) => {
      const soldAt = data.sale.soldAt ?? new Date();
      const productIds = Array.from(new Set(data.sale.items.map((item) => item.productId).filter(Boolean))) as string[];
      const products = productIds.length
        ? await tx.product.findMany({
            where: { tenantId: data.tenantId, id: { in: productIds }, status: "ACTIVE" },
            include: { branchStocks: { where: { branchId: data.branchId } } }
          })
        : [];
      const productsById = new Map(products.map((product) => [product.id, product]));

      if (products.length !== productIds.length) {
        throw new AppError("Um dos produtos da venda nao existe ou esta inativo.", "INVALID_SALE_PRODUCT", 422);
      }

      const cashRegister = await tx.cashRegisterSession.findFirst({
        where: { tenantId: data.tenantId, branchId: data.branchId, status: "OPEN" },
        select: { id: true }
      });
      if (!cashRegister) {
        throw new AppError("Abra o caixa desta loja antes de concluir a venda.", "CASH_REGISTER_NOT_OPEN", 409);
      }

      const quantitiesByProduct = new Map<string, number>();
      for (const item of data.sale.items) {
        if (item.productId) quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity);
      }
      const sale = await tx.sale.create({
        data: {
          tenantId: data.tenantId,
          branchId: data.branchId,
          userId: data.userId,
          cashRegisterSessionId: cashRegister?.id,
          customerId: data.sale.customerId || undefined,
          code: data.code,
          paymentMethod: data.sale.paymentMethod,
          subtotal: data.subtotal,
          discount: data.sale.discount,
          surcharge: data.sale.surcharge,
          total: data.total,
          notes: data.sale.notes,
          soldAt,
          items: {
            create: data.sale.items.map((item) => {
              const product = item.productId ? productsById.get(item.productId) : undefined;
              return {
              productId: product?.id,
              description: product?.name ?? item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              costPrice: product?.costPrice ?? 0,
              category: product?.category,
              species: product?.species,
              brand: product?.brand,
              supplier: product?.supplier,
              total: Math.round((item.quantity * item.unitPrice - item.discount) * 100) / 100
            };})
          }
        }
      });

      if (data.sale.paymentMethod === "CASH") {
        await tx.cashRegisterMovement.create({
          data: {
            sessionId: cashRegister.id,
            tenantId: data.tenantId,
            branchId: data.branchId,
            userId: data.userId,
            type: "CASH_SALE",
            amount: data.total,
            description: `Venda ${sale.code}`
          }
        });
      }

      for (const [productId, quantity] of quantitiesByProduct) {
        const product = productsById.get(productId)!;
        const previousBalance = toNumber(product.branchStocks[0]?.stockQuantity);
        const newBalance = previousBalance - quantity;
        await tx.productBranchStock.update({
          where: { branchId_productId: { branchId: data.branchId, productId } },
          data: { stockQuantity: { decrement: quantity } }
        });
        await tx.inventoryMovement.create({
          data: {
            tenantId: data.tenantId,
            branchId: data.branchId,
            productId,
            userId: data.userId,
            type: "EXIT",
            quantity,
            previousBalance,
            newBalance,
            reason: "Venda de produto",
            reference: sale.code
          }
        });
      }

      await tx.financialEntry.create({
        data: {
          tenantId: data.tenantId,
          branchId: data.branchId,
          saleId: sale.id,
          type: "REVENUE",
          status: data.sale.paymentMethod === "STORE_CREDIT" ? "PENDING" : "PAID",
          description: `Venda ${sale.code}`,
          category: "Vendas",
          amount: data.total,
          dueDate: soldAt,
          paidAt: data.sale.paymentMethod === "STORE_CREDIT" ? null : soldAt,
          paymentMethod: data.sale.paymentMethod
        }
      });

      if (data.sale.customerId) {
        const current = await tx.customer.findUnique({
          where: { id: data.sale.customerId },
          select: {
            firstPurchaseAt: true
          }
        });

        await tx.customer.update({
          where: { id: data.sale.customerId },
          data: {
            firstPurchaseAt: current?.firstPurchaseAt ?? soldAt,
            lastPurchaseAt: soldAt,
            purchaseCount: { increment: 1 },
            totalSpent: { increment: data.total }
          }
        });
      }

      return {
        id: sale.id,
        code: sale.code,
        total: toNumber(sale.total),
        customerId: sale.customerId
      };
    });
  }

  async listSales(tenantId: string, branchId: string | null) {
    const sales = await this.db.sale.findMany({
      where: { tenantId, ...(branchId ? { branchId } : {}) },
      include: {
        branch: { select: { name: true } },
        customer: true,
        items: true,
        _count: {
          select: {
            items: true
          }
        }
      },
      orderBy: {
        soldAt: "desc"
      },
      take: 500
    });

    return sales.map((sale) => ({
      id: sale.id,
      code: sale.code,
      branchName: sale.branch.name,
      customerName: sale.customer?.name,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      soldAt: sale.soldAt,
      subtotal: toNumber(sale.subtotal),
      discount: toNumber(sale.discount),
      surcharge: toNumber(sale.surcharge),
      total: toNumber(sale.total),
      itemsCount: sale._count.items,
      items: sale.items.map((item) => ({
        productId: item.productId,
        description: item.description,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        discount: toNumber(item.discount),
        costPrice: toNumber(item.costPrice),
        total: toNumber(item.total),
        category: item.category,
        species: item.species,
        brand: item.brand,
        supplier: item.supplier
      }))
    }));
  }

  private mapCustomer(customer: CustomerWithPets) {
    return {
      id: customer.id,
      branchId: customer.branchId,
      branchName: customer.branch?.name ?? null,
      name: customer.name,
      document: customer.document,
      email: customer.email,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      birthDate: customer.birthDate,
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
      lastPurchaseAt: customer.lastPurchaseAt,
      purchaseCount: customer.purchaseCount,
      totalSpent: toNumber(customer.totalSpent),
      creditLimit: toNumber(customer.creditLimit),
      pets: customer.pets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        species: pet.species as "DOG" | "CAT",
        sex: pet.sex,
        breed: pet.breed,
        birthDate: pet.birthDate,
        notes: pet.notes
      }))
    };
  }
}
