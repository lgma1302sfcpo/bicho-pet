import { describe, expect, it } from "vitest";

import { AUTH_PERMISSIONS } from "@/lib/permissions";
import {
  createEmployeeUserSchema,
  createRoleSchema,
  passwordResetConfirmSchema,
  registerOwnerSchema
} from "@/schemas/identity/auth.schemas";

describe("identity schemas", () => {
  it("normaliza documento e telefone no cadastro da empresa", () => {
    const parsed = registerOwnerSchema.parse({
      companyName: "Loja Central",
      companyDocument: "12.345.678/0001-90",
      ownerName: "Maria Silva",
      email: "MARIA@EXEMPLO.COM",
      phone: "(11) 99999-1111",
      password: "Senha123",
      confirmPassword: "Senha123"
    });

    expect(parsed.companyDocument).toBe("12345678000190");
    expect(parsed.phone).toBe("11999991111");
    expect(parsed.email).toBe("maria@exemplo.com");
  });

  it("rejeita senha fraca no cadastro", () => {
    const parsed = registerOwnerSchema.safeParse({
      companyName: "Loja Central",
      companyDocument: "12345678000190",
      ownerName: "Maria Silva",
      email: "maria@exemplo.com",
      password: "senhafraca",
      confirmPassword: "senhafraca"
    });

    expect(parsed.success).toBe(false);
  });

  it("exige permissoes validas para criar cargo", () => {
    const parsed = createRoleSchema.parse({
      name: "Caixa",
      description: "Operacao de PDV",
      permissionKeys: [AUTH_PERMISSIONS.SALES_PDV]
    });

    expect(parsed.permissionKeys).toEqual([AUTH_PERMISSIONS.SALES_PDV]);
  });

  it("aceita cadastro de funcionário com usuário e sem e-mail", () => {
    const parsed = createEmployeeUserSchema.parse({
      name: "João Silva",
      username: "Joao.Caixa",
      password: "Senha123",
      branchId: "branch-1",
      permissionKeys: [AUTH_PERMISSIONS.SALES_PDV]
    });

    expect(parsed.username).toBe("joao.caixa");
  });

  it("valida confirmacao de senha no reset", () => {
    const parsed = passwordResetConfirmSchema.safeParse({
      token: "a".repeat(64),
      password: "Senha123",
      confirmPassword: "Senha321"
    });

    expect(parsed.success).toBe(false);
  });
});
