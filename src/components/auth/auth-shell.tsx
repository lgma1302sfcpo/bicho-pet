import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-muted lg:grid-cols-[minmax(360px,520px)_1fr]">
      <section className="flex min-h-screen items-center justify-center px-5 py-10">
        <Card className="w-full max-w-md p-6">
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-600 text-sm font-bold text-white">
                ERP
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">ERP Comercial</p>
                <p className="text-xs text-subdued">Gestao multiempresa</p>
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-ink">{title}</h1>
            <p className="mt-1 text-sm text-subdued">{subtitle}</p>
          </div>
          {children}
        </Card>
      </section>

      <section className="hidden border-l border-border bg-white px-10 py-10 lg:block">
        <div className="grid h-full content-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              Base operacional
            </p>
            <h2 className="mt-3 text-4xl font-semibold text-ink">
              Controle comercial preparado para crescer por modulo.
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {["Empresas", "Cargos", "Permissoes"].map((item) => (
              <div key={item} className="rounded-lg border border-border bg-muted p-4">
                <p className="font-semibold text-ink">{item}</p>
                <p className="mt-1 text-xs text-subdued">Modulo Identity</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
