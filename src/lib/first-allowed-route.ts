import type { Route } from "next";

import { AUTH_PERMISSIONS, hasPermission } from "@/lib/permissions";

const destinations: Array<{ route: Route; permission: (typeof AUTH_PERMISSIONS)[keyof typeof AUTH_PERMISSIONS] | Array<(typeof AUTH_PERMISSIONS)[keyof typeof AUTH_PERMISSIONS]> }> = [
  { route: "/dashboard", permission: AUTH_PERMISSIONS.DASHBOARD_READ },
  { route: "/clientes", permission: AUTH_PERMISSIONS.CUSTOMERS_READ },
  { route: "/produtos", permission: AUTH_PERMISSIONS.PRODUCTS_READ },
  { route: "/vendas/nova", permission: [AUTH_PERMISSIONS.SALES_WRITE, AUTH_PERMISSIONS.SALES_PDV] },
  { route: "/caixa" as Route, permission: AUTH_PERMISSIONS.CASH_READ },
  { route: "/banho-e-tosa" as Route, permission: AUTH_PERMISSIONS.GROOMING_READ },
  { route: "/estoque", permission: AUTH_PERMISSIONS.INVENTORY_READ },
  { route: "/financeiro", permission: AUTH_PERMISSIONS.FINANCE_READ },
  { route: "/relatorios", permission: AUTH_PERMISSIONS.REPORTS_READ },
  { route: "/fiscal", permission: AUTH_PERMISSIONS.FISCAL_READ },
  { route: "/configuracoes/usuarios", permission: AUTH_PERMISSIONS.IDENTITY_USERS_READ }
];

export function firstAllowedRoute(permissions: string[]): Route {
  return destinations.find((destination) => Array.isArray(destination.permission) ? destination.permission.some((permission) => hasPermission(permissions, permission)) : hasPermission(permissions, destination.permission))?.route ?? "/sem-acesso";
}
