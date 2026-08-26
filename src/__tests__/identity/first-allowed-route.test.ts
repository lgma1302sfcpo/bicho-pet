import { describe, expect, it } from "vitest";

import { firstAllowedRoute } from "@/lib/first-allowed-route";
import { AUTH_PERMISSIONS } from "@/lib/permissions";

describe("primeira tela permitida", () => {
  it("não envia o funcionário para uma tela sem permissão após o login", () => {
    expect(firstAllowedRoute([AUTH_PERMISSIONS.PRODUCTS_READ])).toBe("/produtos");
    expect(firstAllowedRoute([AUTH_PERMISSIONS.CUSTOMERS_READ])).toBe("/clientes");
    expect(firstAllowedRoute([])).toBe("/sem-acesso");
  });
});
