import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { Input } from "@/components/ui/input";

describe("campo de senha", () => {
  it("permite visualizar e ocultar a senha", () => {
    render(<Input label="Senha" name="password" type="password" defaultValue="Senha123" />);

    const input = screen.getByLabelText("Senha");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Visualizar senha" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
