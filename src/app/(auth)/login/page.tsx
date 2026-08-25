import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell title="Entrar" subtitle="Acesse sua empresa e continue a operacao.">
      <LoginForm />
    </AuthShell>
  );
}
