"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type InventoryData = {
  products: Array<{ id: string; name: string; category: string; unit: string; stockQuantity: number; minStock: number; maxStock: number; costPrice: number; salePrice: number; isLowStock: boolean }>;
  movements: Array<{ id: string; productName: string; unit: string; userName: string; type: "ENTRY" | "EXIT" | "ADJUSTMENT"; quantity: number; previousBalance: number; newBalance: number; reason: string; reference?: string | null; createdAt: string }>;
};

export type FinancialEntry = { id: string; saleId?: string | null; type: "REVENUE" | "EXPENSE"; status: "PENDING" | "PAID" | "CANCELLED"; description: string; category: string; amount: number; dueDate: string; paidAt?: string | null; paymentMethod?: string | null; notes?: string | null };
export type DashboardData = { metrics: { revenue: number; grossProfit: number; margin: number; pendingExpenses: number; lowStock: number }; cashFlow: Array<{ day: string; revenue: number; expense: number }>; topProducts: Array<{ name: string; quantity: number }>; latestSales: Array<{ id: string; code: string; customerName: string; paymentMethod: string; total: number; soldAt: string }>; upcomingExpenses: Array<{ id: string; description: string; amount: number; dueDate: string }> };

async function api<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message ?? "Não foi possível concluir a operação.");
  return body.data as T;
}

export function useInventory() {
  return useQuery({ queryKey: ["inventory"], queryFn: () => api<InventoryData>("/api/inventory") });
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => api<DashboardData>("/api/dashboard") });
}

export function useCreateInventoryMovement() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (payload: { productId: string; type: string; quantity: number | string; reason: string; reference?: string }) => api("/api/inventory", { method: "POST", body: JSON.stringify(payload) }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); queryClient.invalidateQueries({ queryKey: ["catalog", "products"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } });
}

export function useFinance() {
  return useQuery({ queryKey: ["finance"], queryFn: () => api<FinancialEntry[]>("/api/finance") });
}

export function useCreateFinancialEntry() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (payload: Record<string, unknown>) => api("/api/finance", { method: "POST", body: JSON.stringify(payload) }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["finance"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } });
}

export function useUpdateFinancialStatus() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: FinancialEntry["status"] }) => api(`/api/finance/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["finance"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } });
}

export function useDeleteFinancialEntry() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api(`/api/finance/${id}`, { method: "DELETE" }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["finance"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } });
}
