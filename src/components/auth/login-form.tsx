"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LogIn, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LoginDTO } from "@/dtos/identity/auth.dto";
import { loginSchema } from "@/schemas/identity/auth.schemas";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginDTO>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  async function onSubmit(values: LoginDTO) {
    setServerError(null);

    const result = await signIn("credentials", {
      ...values,
      redirect: false
    });

    if (result?.error) {
      setServerError("Email ou senha invalidos.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Senha"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      {serverError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-danger">
          {serverError}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        <LogIn size={18} />
        Entrar
      </Button>

      <div className="flex flex-col gap-2 text-sm text-subdued sm:flex-row sm:items-center sm:justify-between">
        <Link className="inline-flex items-center gap-2 hover:text-brand-700" href="/recuperar-senha">
          <KeyRound size={16} />
          Recuperar senha
        </Link>
        <Link className="inline-flex items-center gap-2 hover:text-brand-700" href="/cadastro">
          <Mail size={16} />
          Criar conta
        </Link>
      </div>
    </form>
  );
}
