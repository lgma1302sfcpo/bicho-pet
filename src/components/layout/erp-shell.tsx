"use client";

import {
  BarChart3,
  Boxes,
  ClipboardList,
  LogOut,
  Package,
  ReceiptText,
  Landmark,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  WalletCards
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ShellUser = {
  name?: string | null;
  email?: string | null;
  currentTenantName: string;
  currentBranchId?: string | null;
  currentBranchName?: string | null;
  canAccessAllBranches: boolean;
  roleName: string;
};

type ErpShellProps = {
  user: ShellUser;
  branches: Array<{ id: string; name: string; isMain: boolean }>;
  children: ReactNode;
};

type EnabledNavItem = {
  href: Route;
  label: string;
  icon: typeof BarChart3;
  enabled: true;
};

const navItems: EnabledNavItem[] = [
  { href: "/dashboard", label: "Visao geral", icon: BarChart3, enabled: true },
  { href: "/clientes", label: "Clientes", icon: Users, enabled: true },
  { href: "/produtos", label: "Produtos", icon: Package, enabled: true },
  { href: "/vendas/nova", label: "Vendas", icon: ReceiptText, enabled: true },
  { href: "/estoque", label: "Estoque", icon: Boxes, enabled: true },
  { href: "/ponto-de-venda", label: "Ponto de venda", icon: ShoppingCart, enabled: true },
  { href: "/financeiro", label: "Financeiro", icon: WalletCards, enabled: true },
  { href: "/relatorios", label: "Relatórios", icon: ClipboardList, enabled: true },
  { href: "/fiscal", label: "Fiscal", icon: Landmark, enabled: true },
  { href: "/configuracoes/usuarios", label: "Configurações", icon: Settings, enabled: true }
];

export function ErpShell({ user, branches, children }: ErpShellProps) {
  const pathname = usePathname();
  const { update } = useSession();
  const [switchingBranch, setSwitchingBranch] = useState(false);

  async function switchBranch(branchId: string) {
    setSwitchingBranch(true);
    await update({ currentBranchId: branchId === "ALL" ? null : branchId });
    window.location.assign(pathname);
  }

  return (
    <div className="min-h-screen bg-muted text-ink lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-border bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white p-0.5 shadow-sm ring-1 ring-border">
              <BrandLogo className="h-10 w-10" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Casa dos Bichos</p>
              <p className="truncate text-xs text-subdued">{user.currentTenantName}</p>
            </div>
          </div>
          <Button
            className="lg:hidden"
            variant="ghost"
            title="Sair"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut size={18} />
          </Button>
        </div>

        <div className="border-b border-border px-4 py-3">
          {user.canAccessAllBranches && branches.length > 1 ? (
            <Select
              label="Loja em uso"
              help="As telas e os relatórios mostram somente a loja selecionada. Escolha todas as lojas para consultar os totais gerais."
              value={user.currentBranchId ?? "ALL"}
              disabled={switchingBranch}
              onChange={(event) => void switchBranch(event.target.value)}
            >
              <option value="ALL">Todas as lojas</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.isMain ? " (principal)" : ""}</option>)}
            </Select>
          ) : (
            <div className="rounded-md bg-muted px-3 py-2">
              <p className="text-xs text-subdued">Loja em uso</p>
              <p className="truncate text-sm font-semibold">{user.currentBranchName ?? branches[0]?.name ?? "Loja não definida"}</p>
            </div>
          )}
        </div>

        <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:block lg:space-y-1 lg:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.enabled && pathname === item.href;
            const content = (
              <>
                <Icon size={18} />
                <span>{item.label}</span>
              </>
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition lg:flex",
                  active ? "bg-brand-50 text-brand-700" : "text-subdued hover:bg-muted hover:text-ink"
                )}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-border p-4 lg:block">
          <div className="mb-3 flex items-center gap-2 text-sm">
            <ShieldCheck className="text-success" size={18} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-subdued">{user.roleName}</p>
            </div>
          </div>
          <Button variant="secondary" className="w-full justify-start" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut size={18} />
            Sair
          </Button>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">{children}</main>
    </div>
  );
}
