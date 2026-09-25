import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/auth/login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn()
}));

describe("formulário de login", () => {
  it("usa POST como fallback para não expor a senha na URL antes da hidratação", () => {
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: "Entrar no sistema" }).closest("form")).toHaveAttribute("method", "post");
  });
});
