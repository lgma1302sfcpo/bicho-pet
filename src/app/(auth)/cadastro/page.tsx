import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthShell title="Cadastrar empresa" subtitle="Crie a empresa matriz e o usuario administrador.">
      <RegisterForm />
    </AuthShell>
  );
}
