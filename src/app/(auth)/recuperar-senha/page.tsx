import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Recuperar senha" subtitle="A recuperação é feita pelo administrador da loja.">
      <div className="space-y-4 text-sm text-subdued">
        <p>Entre em contato com o administrador pelo WhatsApp. Ele poderá gerar uma senha temporária em <strong>Configurações → Usuários</strong>.</p>
        <p>Após entrar, altere a senha temporária para uma senha pessoal.</p>
        <Link className="block text-brand-700 underline" href="/login">Voltar para o login</Link>
      </div>
    </AuthShell>
  );
}
