"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GroomingAgendaDTO, GroomingCalendarDTO } from "@/dtos/grooming.dto";

type ApiEnvelope<T> = { data?: T; error?: { message?: string } };

async function apiFetch<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok) throw new Error(body.error?.message ?? "Não foi possível concluir a operação.");
  return body.data as T;
}

export function useGroomingAgenda(date: string) {
  return useQuery({
    queryKey: ["grooming", date],
    queryFn: () => apiFetch<GroomingAgendaDTO>(`/api/grooming?date=${date}`),
    refetchOnMount: "always"
  });
}

export function useGroomingCalendar(month: string) {
  return useQuery({
    queryKey: ["grooming", "calendar", month],
    queryFn: () => apiFetch<GroomingCalendarDTO>(`/api/grooming/calendar?month=${month}`)
  });
}

export function useCreateGroomingAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { customerId: string; petId: string; serviceId: string; professionalId: string; startAt: string; price: number | string; isPackage: boolean; notes?: string }) =>
      apiFetch("/api/grooming", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grooming"] })
  });
}

export function useUpdateGroomingAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; status?: string; purchasedProducts?: boolean; photoTaken?: boolean; reminderSent?: boolean; notes?: string }) =>
      apiFetch(`/api/grooming/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grooming"] })
  });
}

export function useCreateGroomingBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { professionalId?: string; startAt: string; endAt: string; reason: string }) =>
      apiFetch("/api/grooming/blocks", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grooming"] })
  });
}

export function useDeleteGroomingBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/grooming/blocks/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grooming"] })
  });
}

export function useSaveGroomingProfessional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id?: string; name: string; commissionPercent: number | string }) =>
      apiFetch("/api/grooming/professionals", { method: payload.id ? "PATCH" : "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grooming"] })
  });
}

export function useSaveGroomingService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id?: string; name: string; durationMinutes: number | string; defaultPrice: number | string }) =>
      apiFetch("/api/grooming/services", { method: payload.id ? "PATCH" : "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grooming"] })
  });
}
