"use client";

import {
  BarChart3,
  CalendarDays,
  Boxes,
  ClipboardList,
  LogOut,
  Package,
  ReceiptText,
  Landmark,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  Banknote,
  X
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { Select } from "@/components/ui/select";
import { AUTH_PERMISSIONS, hasPermission, type PermissionKey } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type ShellUser = {
  name?: string | null;
  email?: string | null;
  currentTenantName: string;
  currentBranchId?: string | null;
  currentBranchName?: string | null;
  canAccessAllBranches: boolean;
  roleName: string;
  permissions: string[];
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
  permission: PermissionKey | PermissionKey[];
  enabled: true;
};

const navItems: EnabledNavItem[] = [
  { href: "/dashboard", label: "Visão geral", icon: BarChart3, permission: AUTH_PERMISSIONS.DASHBOARD_READ, enabled: true },
  { href: "/clientes", label: "Clientes", icon: Users, permission: AUTH_PERMISSIONS.CUSTOMERS_READ, enabled: true },
  { href: "/produtos", label: "Produtos", icon: Package, permission: AUTH_PERMISSIONS.PRODUCTS_READ, enabled: true },
  { href: "/vendas/nova", label: "Vendas", icon: ReceiptText, permission: [AUTH_PERMISSIONS.SALES_WRITE, AUTH_PERMISSIONS.SALES_PDV], enabled: true },
  { href: "/caixa" as Route, label: "Caixa", icon: Banknote, permission: AUTH_PERMISSIONS.CASH_READ, enabled: true },
  { href: "/banho-e-tosa" as Route, label: "Banho e Tosa", icon: CalendarDays, permission: AUTH_PERMISSIONS.GROOMING_READ, enabled: true },
  { href: "/estoque", label: "Estoque", icon: Boxes, permission: AUTH_PERMISSIONS.INVENTORY_READ, enabled: true },
  { href: "/financeiro", label: "Financeiro", icon: WalletCards, permission: AUTH_PERMISSIONS.FINANCE_READ, enabled: true },
  { href: "/relatorios", label: "Relatórios", icon: ClipboardList, permission: AUTH_PERMISSIONS.REPORTS_READ, enabled: true },
  { href: "/fiscal", label: "Fiscal", icon: Landmark, permission: AUTH_PERMISSIONS.FISCAL_READ, enabled: true },
  { href: "/configuracoes/usuarios", label: "Configurações", icon: Settings, permission: AUTH_PERMISSIONS.IDENTITY_USERS_READ, enabled: true }
];

export function ErpShell({ user, branches, children }: ErpShellProps) {
  const pathname = usePathname();
  const { update } = useSession();
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const [branchSwitchError, setBranchSwitchError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const availableNavItems = navItems.filter((item) => Array.isArray(item.permission) ? item.permission.some((permission) => hasPermission(user.permissions, permission)) : hasPermission(user.permissions, item.permission));

  async function switchBranch(branchId: string) {
    setSwitchingBranch(true);
    setBranchSwitchError(null);
    try {
      const updatedSession = await update({ currentBranchId: branchId === "ALL" ? null : branchId });
      if (!updatedSession) throw new Error("SESSION_UPDATE_FAILED");
      window.location.assign(pathname);
    } catch {
      setSwitchingBranch(false);
      setBranchSwitchError("Não foi possível alterar a loja. Atualize a página e tente novamente.");
    }
  }

  return (
    <div className="erp-shell min-h-screen bg-muted text-ink lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="erp-sidebar border-b border-border bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="erp-sidebar__brand flex items-center justify-between gap-3 border-b border-border px-4 py-4 lg:block">
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
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        <div className="erp-sidebar__branch border-b border-border px-4 py-3">
          {user.canAccessAllBranches && branches.length > 1 ? (
            <Select
              label={switchingBranch ? "Alterando loja..." : "Loja em uso"}
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
          {branchSwitchError ? <p className="mt-2 text-xs font-medium text-danger">{branchSwitchError}</p> : null}
        </div>

        <nav className={cn("erp-nav px-3 py-3 lg:block lg:space-y-1", mobileMenuOpen ? "grid grid-cols-2 gap-2" : "hidden")}>
          {availableNavItems.map((item) => {
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
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "erp-nav__item inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition lg:flex",
                  active ? "bg-brand-50 text-brand-700" : "text-subdued hover:bg-muted hover:text-ink"
                )}
              >
                {content}
              </Link>
            );
          })}
          <Button variant="secondary" className="col-span-2 mt-1 justify-start lg:hidden" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut size={18} />Sair
          </Button>
        </nav>

        <div className="erp-sidebar__footer hidden border-t border-border p-4 lg:block">
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

      <main className="erp-main min-w-0 overflow-x-hidden px-3 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="erp-content">{children}</div>
      </main>
    </div>
  );
}
