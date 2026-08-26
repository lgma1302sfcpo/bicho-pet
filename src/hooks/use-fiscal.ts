"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type FiscalOverview = {
  configuration: Record<string, unknown> | null;
  sequences: Array<{ id: string; type: string; environment: string; series: number; nextNumber: number }>;
  numberVoids: Array<{ id: string; type: string; environment: string; series: number; numberFrom: number; numberTo: number; status: string; protocol?: string | null; rejectionReason?: string | null; createdAt: string }>;
  sales: Array<{ id: string; code: string; total: number; soldAt: string; customerName: string; fiscalDocuments: Array<{ type: string; status: string }> }>;
  documents: Array<{
    id: string; type: string; environment: string; provider: string; series: number; number: number; status: string;
    accessKey?: string | null; protocol?: string | null; rejectionReason?: string | null; hasXml: boolean; hasPdf: boolean;
    authorizedAt?: string | null; cancelledAt?: string | null; emailedAt?: string | null; createdAt: string;
    sale: { code: string; total: number; customer?: { name: string; email?: string | null } | null };
    events: Array<{ id: string; success: boolean; message: string; createdAt: string; type: string }>;
  }>;
};

type Envelope<T> = { data?: T; error?: { message?: string } };

async function fiscalFetch<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({})) as Envelope<T>;
  if (!response.ok) throw new Error(body.error?.message ?? "Não foi possível concluir a operação fiscal.");
  return body.data as T;
}

export function useFiscalOverview() {
  return useQuery({ queryKey: ["fiscal"], queryFn: () => fiscalFetch<FiscalOverview>("/api/fiscal") });
}

function useFiscalMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => client.invalidateQueries({ queryKey: ["fiscal"] }) });
}

export function useSaveFiscalConfiguration() {
  return useFiscalMutation<Record<string, unknown>>((payload) => fiscalFetch("/api/fiscal", { method: "PUT", body: JSON.stringify(payload) }));
}

export function useIssueFiscalDocument() {
  return useFiscalMutation<{ saleId: string; type: string; series: number; contingency?: boolean; contingencyReason?: string }>((payload) => fiscalFetch("/api/fiscal/documents", { method: "POST", body: JSON.stringify(payload) }));
}

export function useFiscalAction() {
  return useFiscalMutation<{ id: string; action: "query" | "cancel" | "email" | "transmit"; reason?: string }>((input) => fiscalFetch(`/api/fiscal/documents/${input.id}/${input.action}`, { method: "POST", body: input.reason ? JSON.stringify({ reason: input.reason }) : undefined }));
}

export function useVoidFiscalNumber() {
  return useFiscalMutation<Record<string, unknown>>((payload) => fiscalFetch("/api/fiscal/void-number", { method: "POST", body: JSON.stringify(payload) }));
}

export function useSefazStatus() {
  return useMutation({ mutationFn: (type: "NFE" | "NFCE") => fiscalFetch<{ available: boolean; code: string; message: string; checkedAt: string }>(`/api/fiscal/status?type=${type}`) });
}
