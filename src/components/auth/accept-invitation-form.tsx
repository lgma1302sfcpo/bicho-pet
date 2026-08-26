"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, UserCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AcceptEmployeeInvitationDTO } from "@/dtos/identity/auth.dto";
import { acceptEmployeeInvitationSchema } from "@/schemas/identity/auth.schemas";

type InvitationInfo = { email: string; tenantName: string; branchName: string; expiresAt: string };
type Envelope<T> = { data?: T; error?: { message?: string } };

export function AcceptInvitationForm({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const form = useForm<AcceptEmployeeInvitationDTO>({
    resolver: zodResolver(acceptEmployeeInvitationSchema),
    defaultValues: { token, name: "", password: "", confirmPassword: "" }
  });

  useEffect(() => {
    if (!token) {
      setError("O link do convite está incompleto.");
      return;
    }
    void fetch(`/api/auth/invitations/${encodeURIComponent(token)}`)
      .then(async (response) => ({ response, body: await response.json() as Envelope<InvitationInfo> }))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body.error?.message ?? "Convite inválido.");
        setInvitation(body.data ?? null);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Convite inválido."));
  }, [token]);

  async function accept(values: AcceptEmployeeInvitationDTO) {
    setError(null);
    const response = await fetch(`/api/auth/invitations/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const body = await response.json() as Envelope<{ message: string }>;
    if (!response.ok) {
      setError(body.error?.message ?? "Não foi possível aceitar o convite.");
      return;
    }
    setAccepted(true);
  }

  if (accepted) {
    return <div className="space-y-4"><div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-success"><CheckCircle2 size={19}/><span>Seu acesso foi ativado. Entre usando o e-mail convidado e a senha que acabou de criar.</span></div><Link href="/login"><Button className="w-full">Ir para o login</Button></Link></div>;
  }

  return (
    <div className="space-y-5">
      {invitation ? <div className="rounded-md border border-brand-200 bg-brand-50 p-3 text-sm"><p className="font-semibold">{invitation.tenantName}</p><p className="text-subdued">Loja: {invitation.branchName}</p><p className="text-subdued">E-mail: {invitation.email}</p></div> : null}
      <form className="space-y-4" onSubmit={form.handleSubmit(accept)}>
        <Input label="Seu nome" autoComplete="name" error={form.formState.errors.name?.message} {...form.register("name")}/>
        <Input label="Crie uma senha" type="password" autoComplete="new-password" error={form.formState.errors.password?.message} {...form.register("password")}/>
        <Input label="Confirme a senha" type="password" autoComplete="new-password" error={form.formState.errors.confirmPassword?.message} {...form.register("confirmPassword")}/>
        <Button className="w-full" type="submit" disabled={!invitation || form.formState.isSubmitting}><UserCheck size={18}/>Ativar meu acesso</Button>
      </form>
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-danger">{error}</p> : null}
      <Link className="block text-sm text-subdued hover:text-brand-700" href="/login">Voltar para o login</Link>
    </div>
  );
}
