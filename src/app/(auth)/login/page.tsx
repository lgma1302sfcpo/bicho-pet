import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell title="Bem-vindo de volta" subtitle="Entre com seus dados para acessar o painel da Bicho Pet.">
      <LoginForm />
    </AuthShell>
  );
}
