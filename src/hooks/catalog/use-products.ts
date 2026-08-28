"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateProductDTO,
  ProductFiltersDTO,
  ProductListItemDTO,
  ProductSummaryDTO,
  UpdateProductDTO
} from "@/dtos/catalog/product.dto";

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

type ProductListResponse = {
  products: ProductListItemDTO[];
  summary: ProductSummaryDTO;
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

function buildProductQuery(filters: ProductFiltersDTO) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

export function useProducts(filters: ProductFiltersDTO) {
  return useQuery({
    queryKey: ["catalog", "products", filters],
    queryFn: () => {
      const query = buildProductQuery(filters);
      return apiFetch<ProductListResponse>(`/api/products${query ? `?${query}` : ""}`);
    },
    placeholderData: (previousData) => previousData
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductDTO) =>
      apiFetch<ProductListItemDTO>("/api/products", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", "products"] });
    }
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductDTO }) =>
      apiFetch<ProductListItemDTO>(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "products"] })
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch<{ deleted: true }>(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog", "products"] })
  });
}
