import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AuthShell title="Ativar acesso" subtitle="Confirme seus dados e crie sua senha para entrar no sistema."><AcceptInvitationForm token={token}/></AuthShell>;
}
