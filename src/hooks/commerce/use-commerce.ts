"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateCustomerDTO,
  CustomerEngagementSummaryDTO,
  CustomerFiltersDTO,
  CustomerListItemDTO,
  UpdateCustomerDTO
} from "@/dtos/commerce/customer.dto";
import type { CreateSaleDTO, SaleCreatedDTO, SaleListItemDTO } from "@/dtos/commerce/sale.dto";

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

type CustomerListResponse = {
  customers: CustomerListItemDTO[];
  summary: CustomerEngagementSummaryDTO;
};

async function apiFetch<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(body.error?.message ?? "Falha na requisicao.");
  }

  return body.data as T;
}

function buildCustomerQuery(filters: CustomerFiltersDTO) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

export function useCustomers(filters: CustomerFiltersDTO) {
  return useQuery({
    queryKey: ["commerce", "customers", filters],
    queryFn: () => {
      const query = buildCustomerQuery(filters);
      return apiFetch<CustomerListResponse>(`/api/customers${query ? `?${query}` : ""}`);
    }
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCustomerDTO) =>
      apiFetch<CustomerListItemDTO>("/api/customers", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commerce", "customers"] });
    }
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomerDTO }) =>
      apiFetch<CustomerListItemDTO>(`/api/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commerce", "customers"] })
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch<{ deleted: true }>(`/api/customers/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commerce", "customers"] })
  });
}

export function useAssignCustomerBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, branchId }: { id: string; branchId: string }) =>
      apiFetch<{ customerId: string; branchId: string; branchName: string }>(`/api/customers/${id}/branch`, {
        method: "PATCH",
        body: JSON.stringify({ branchId })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commerce", "customers"] })
  });
}

export function useSendCustomerEmail() {
  return useMutation({
    mutationFn: ({ id, subject, message }: { id: string; subject: string; message: string }) =>
      apiFetch<{ id: string; to: string }>(`/api/customers/${id}/email`, {
        method: "POST",
        body: JSON.stringify({ subject, message })
      })
  });
}

export function useSales() {
  return useQuery({
    queryKey: ["commerce", "sales"],
    queryFn: () => apiFetch<SaleListItemDTO[]>("/api/sales"),
    refetchOnMount: "always"
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSaleDTO) =>
      apiFetch<SaleCreatedDTO>("/api/sales", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["commerce", "customers"] }),
        queryClient.invalidateQueries({ queryKey: ["commerce", "sales"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["finance"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["fiscal"] })
      ]);
    }
  });
}
