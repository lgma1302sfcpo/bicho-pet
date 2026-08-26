"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LogIn } from "lucide-react";
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
      setServerError("E-mail ou senha inválidos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="seuemail@casadosbichos.com.br"
        className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus:bg-white"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Senha"
        type="password"
        autoComplete="current-password"
        placeholder="Digite sua senha"
        className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus:bg-white"
        error={errors.password?.message}
        {...register("password")}
      />

      {serverError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-danger">
          {serverError}
        </div>
      ) : null}

      <Button type="submit" className="h-12 w-full rounded-xl shadow-lg shadow-brand-600/20" disabled={isSubmitting}>
        <LogIn size={18} />
        {isSubmitting ? "Entrando..." : "Entrar no sistema"}
      </Button>

      <div className="flex justify-center border-t border-slate-100 pt-4 text-sm text-subdued">
        <Link className="inline-flex items-center gap-2 font-medium transition hover:text-brand-700" href="/recuperar-senha">
          <KeyRound size={16} />
          Recuperar senha
        </Link>
      </div>
    </form>
  );
}
