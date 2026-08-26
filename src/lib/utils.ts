import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function parseBrazilianNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const raw = value.trim().replace(/R\$\s?/g, "").replace(/\s/g, "");
  const cleaned = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  return cleaned === "" ? undefined : Number(cleaned);
}

export type InputMask = "currency" | "decimal" | "integer" | "phone" | "document" | "letters";

export function applyInputMask(value: string, mask: InputMask) {
  if (mask === "currency") {
    const cents = onlyDigits(value);
    if (!cents) return "";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(cents) / 100);
  }
  if (mask === "integer") return onlyDigits(value);
  if (mask === "decimal") {
    const cleaned = value.replace(/\./g, ",").replace(/[^\d,]/g, "");
    const [integer = "", ...decimals] = cleaned.split(",");
    return `${integer}${decimals.length ? `,${decimals.join("").slice(0, 3)}` : ""}`;
  }
  if (mask === "letters") return value.replace(/[^\p{L}\s.'-]/gu, "");
  const digits = onlyDigits(value).slice(0, mask === "document" ? 14 : 11);
  if (mask === "phone") {
    if (digits.length <= 10) return digits.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_all, area, first, last) => `(${area}${area.length === 2 ? ") " : ""}${first}${last ? `-${last}` : ""}`);
    return digits.replace(/(\d{2})(\d{0,5})(\d{0,4})/, (_all, area, first, last) => `(${area}) ${first}${last ? `-${last}` : ""}`);
  }
  if (digits.length <= 11) return digits.replace(/(\d{3})(\d{0,3})(\d{0,3})(\d{0,2})/, (_all, a, b, c, d) => `${a}${b ? `.${b}` : ""}${c ? `.${c}` : ""}${d ? `-${d}` : ""}`);
  return digits.replace(/(\d{2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})/, (_all, a, b, c, d, e) => `${a}${b ? `.${b}` : ""}${c ? `.${c}` : ""}${d ? `/${d}` : ""}${e ? `-${e}` : ""}`);
}
