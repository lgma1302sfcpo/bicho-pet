"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RegisterOwnerDTO } from "@/dtos/identity/auth.dto";
import { registerOwnerSchema } from "@/schemas/identity/auth.schemas";

type ApiError = {
  error?: {
    message?: string;
  };
};

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterOwnerDTO>({
    resolver: zodResolver(registerOwnerSchema),
    defaultValues: {
      companyName: "",
      companyDocument: "",
      ownerName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: ""
    }
  });

  async function onSubmit(values: RegisterOwnerDTO) {
    setServerError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiError;
      setServerError(body.error?.message ?? "Nao foi possivel cadastrar.");
      return;
    }

    const signInResult = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false
    });

    if (signInResult?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Empresa"
          autoComplete="organization"
          error={errors.companyName?.message}
          {...register("companyName")}
        />
        <Input
          label="CPF/CNPJ"
          inputMode="numeric"
          error={errors.companyDocument?.message}
          {...register("companyDocument")}
        />
      </div>
      <Input label="Responsavel" autoComplete="name" error={errors.ownerName?.message} {...register("ownerName")} />
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Input label="Telefone" inputMode="tel" error={errors.phone?.message} {...register("phone")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
      </div>

      {serverError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-danger">
          {serverError}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        <UserPlus size={18} />
        Criar empresa
      </Button>

      <Link className="inline-flex items-center gap-2 text-sm text-subdued hover:text-brand-700" href="/login">
        <Building2 size={16} />
        Ja tenho conta
      </Link>
    </form>
  );
}
