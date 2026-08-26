import { Boxes, Heart, PawPrint, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8fc] lg:grid lg:grid-cols-[minmax(420px,0.92fr)_minmax(520px,1.08fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-brand-700 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="auth-paw-pattern absolute inset-0 opacity-10" aria-hidden="true" />
        <div className="absolute -left-28 top-1/3 h-80 w-80 rounded-full bg-pet-yellow/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-28 -top-24 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="rounded-full bg-white p-1.5 shadow-2xl shadow-blue-950/30">
            <BrandLogo className="h-16 w-16" priority />
          </div>
          <div>
            <p className="text-xl font-extrabold tracking-tight">Casa dos Bichos</p>
            <p className="text-sm font-medium text-blue-100">Gestão do pet shop</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl py-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-50 backdrop-blur-sm">
            <Sparkles size={15} className="text-pet-yellow" />
            Tudo em um só lugar
          </div>
          <h2 className="max-w-lg text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
            Cuidado com os bichos. Controle para o negócio.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-blue-100 xl:text-lg">
            Uma operação mais simples para a equipe dedicar tempo ao que realmente importa: atender bem cada pet e sua família.
          </p>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              { icon: ShoppingBag, label: "Vendas" },
              { icon: Boxes, label: "Estoque" },
              { icon: Heart, label: "Clientes" }
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <Icon size={22} className="mb-3 text-pet-yellow" />
                <p className="text-sm font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-sm text-blue-100">
          <ShieldCheck size={18} className="text-pet-yellow" />
          Ambiente seguro e exclusivo para a equipe
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-100/70 blur-3xl lg:hidden" aria-hidden="true" />
        <div className="relative w-full max-w-[460px]">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="rounded-full bg-white p-1 shadow-lg">
              <BrandLogo className="h-14 w-14" priority />
            </div>
            <div>
              <p className="font-extrabold tracking-tight text-brand-700">Casa dos Bichos</p>
              <p className="text-xs font-medium text-subdued">Gestão do pet shop</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_24px_80px_rgba(25,52,112,0.12)] backdrop-blur sm:p-9">
            <div className="mb-7">
              <div className="mb-5 hidden h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 lg:flex">
                <PawPrint size={23} />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Área da equipe</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-subdued">{subtitle}</p>
            </div>
            {children}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Pet Shop Casa dos Bichos
          </p>
        </div>
      </section>
    </main>
  );
}
