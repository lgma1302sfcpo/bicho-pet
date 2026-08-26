import { describe, expect, it } from "vitest";

import { applyInputMask, parseBrazilianNumber } from "@/lib/utils";

describe("máscara decimal", () => {
  it("aceita ponto ou vírgula sem transformar cinco em quinhentos", () => {
    expect(applyInputMask("5.00", "decimal")).toBe("5,00");
    expect(applyInputMask("5,00", "decimal")).toBe("5,00");
    expect(parseBrazilianNumber(applyInputMask("5.00", "decimal"))).toBe(5);
  });
});
