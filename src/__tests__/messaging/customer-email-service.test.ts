import { describe, expect, it, vi } from "vitest";

import type { CommerceRepository } from "@/interfaces/commerce/commerce-repository.interface";
import type { EmailSender } from "@/interfaces/messaging/email-sender.interface";
import { CustomerEmailService } from "@/services/messaging/customer-email.service";

describe("CustomerEmailService", () => {
  it("envia para o email cadastrado e escapa HTML da mensagem", async () => {
    const repository = {
      findCustomerById: vi.fn().mockResolvedValue({
        id: "customer-1",
        name: "Ana & Bob",
        email: "cliente@example.invalid",
        tags: [],
        status: "ACTIVE",
        purchaseCount: 0,
        totalSpent: 0,
        creditLimit: 0
      })
    } as unknown as CommerceRepository;
    const sender = { send: vi.fn().mockResolvedValue({ id: "email-1" }) } as EmailSender;
    const service = new CustomerEmailService(repository, sender);

    const result = await service.sendToCustomer("tenant-1", "customer-1", {
      subject: "Oferta especial",
      message: "Volte <agora>\nCupom PET10"
    });

    expect(result).toEqual({ id: "email-1", to: "cliente@example.invalid" });
    expect(sender.send).toHaveBeenCalledWith(expect.objectContaining({
      to: "cliente@example.invalid",
      html: expect.stringContaining("Volte &lt;agora&gt;<br />Cupom PET10")
    }));
  });

  it("bloqueia envio para cliente sem email", async () => {
    const repository = {
      findCustomerById: vi.fn().mockResolvedValue({
        id: "customer-1",
        name: "Sem Email",
        tags: [],
        status: "ACTIVE",
        purchaseCount: 0,
        totalSpent: 0,
        creditLimit: 0
      })
    } as unknown as CommerceRepository;
    const sender = { send: vi.fn() } as EmailSender;
    const service = new CustomerEmailService(repository, sender);

    await expect(service.sendToCustomer("tenant-1", "customer-1", {
      subject: "Oferta especial",
      message: "Volte esta semana"
    })).rejects.toMatchObject({ code: "CUSTOMER_WITHOUT_EMAIL" });
    expect(sender.send).not.toHaveBeenCalled();
  });
});
