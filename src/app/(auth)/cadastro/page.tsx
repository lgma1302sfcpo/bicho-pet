import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await prisma.tenant.count() > 0) redirect("/login");

  return (
    <AuthShell title="Configuração inicial" subtitle="Crie o administrador da Bicho Pet.">
      <RegisterForm />
    </AuthShell>
  );
}
