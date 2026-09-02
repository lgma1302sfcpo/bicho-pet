"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CashRegisterData } from "@/types/cash-register";

type ApiEnvelope<T> = { data?: T; error?: { message?: string } };

async function apiFetch<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok) throw new Error(body.error?.message ?? "Não foi possível concluir a operação.");
  return body.data as T;
}

export function useCashRegister() {
  return useQuery({ queryKey: ["cash-register"], queryFn: () => apiFetch<CashRegisterData>("/api/cash-register"), refetchOnMount: "always" });
}

function useCashMutation<T>(url: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: T) => apiFetch(url, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cash-register"] })
  });
}

export function useOpenCashRegister() {
  return useCashMutation<{ openingAmount: number; notes?: string }>("/api/cash-register/open");
}

export function useCashMovement() {
  return useCashMutation<{ type: "SUPPLY" | "WITHDRAWAL"; amount: number; description: string }>("/api/cash-register/movements");
}

export function useCloseCashRegister() {
  return useCashMutation<{ actualAmount: number; notes?: string }>("/api/cash-register/close");
}

export function useReopenCashRegister() {
  return useCashMutation<{ cashRegisterId: string }>("/api/cash-register/reopen");
}
