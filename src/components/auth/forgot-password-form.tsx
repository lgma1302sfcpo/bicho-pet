"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, KeyRound, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PasswordResetConfirmDTO, PasswordResetRequestDTO } from "@/dtos/identity/auth.dto";
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema
} from "@/schemas/identity/auth.schemas";

type ResetResponse = {
  data?: {
    message?: string;
    resetToken?: string;
  };
  error?: {
    message?: string;
  };
};

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestForm = useForm<PasswordResetRequestDTO>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: "" }
  });
  const confirmForm = useForm<PasswordResetConfirmDTO>({
    resolver: zodResolver(passwordResetConfirmSchema),
    defaultValues: {
      token: "",
      password: "",
      confirmPassword: ""
    }
  });

  async function requestReset(values: PasswordResetRequestDTO) {
    setError(null);
    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const body = (await response.json().catch(() => ({}))) as ResetResponse;

    if (!response.ok) {
      setError(body.error?.message ?? "Não foi possível solicitar a recuperação.");
      return;
    }

    setMessage(body.data?.message ?? "Solicitação registrada.");
    setResetToken(body.data?.resetToken ?? null);
    if (body.data?.resetToken) {
      confirmForm.setValue("token", body.data.resetToken);
    }
  }

  async function confirmReset(values: PasswordResetConfirmDTO) {
    setError(null);
    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const body = (await response.json().catch(() => ({}))) as ResetResponse;

    if (!response.ok) {
      setError(body.error?.message ?? "Não foi possível alterar a senha.");
      return;
    }

    setMessage(body.data?.message ?? "Senha alterada.");
    setResetToken(null);
    confirmForm.reset();
  }

  return (
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={requestForm.handleSubmit(requestReset)}>
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          error={requestForm.formState.errors.email?.message}
          {...requestForm.register("email")}
        />
        <Button type="submit" className="w-full" disabled={requestForm.formState.isSubmitting}>
          <Send size={18} />
          Enviar instruções
        </Button>
      </form>

      {resetToken ? (
        <form className="space-y-4 border-t border-border pt-5" onSubmit={confirmForm.handleSubmit(confirmReset)}>
          <Input label="Token" error={confirmForm.formState.errors.token?.message} {...confirmForm.register("token")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              error={confirmForm.formState.errors.password?.message}
              {...confirmForm.register("password")}
            />
            <Input
              label="Confirmar senha"
              type="password"
              autoComplete="new-password"
              error={confirmForm.formState.errors.confirmPassword?.message}
              {...confirmForm.register("confirmPassword")}
            />
          </div>
          <Button type="submit" className="w-full" disabled={confirmForm.formState.isSubmitting}>
            <KeyRound size={18} />
            Alterar senha
          </Button>
        </form>
      ) : null}

      {message ? (
        <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-success">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-danger">
          {error}
        </div>
      ) : null}

      <Link className="text-sm text-subdued hover:text-brand-700" href="/login">
        Voltar para login
      </Link>
    </div>
  );
}
