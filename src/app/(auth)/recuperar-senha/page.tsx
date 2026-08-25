import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Recuperar senha" subtitle="Solicite um token e defina uma nova senha.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
