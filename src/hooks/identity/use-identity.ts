"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateRoleDTO, CreateUserDTO, InviteEmployeeDTO } from "@/dtos/identity/auth.dto";
import type {
  PermissionRecord,
  RoleRecord,
  UserRecord
} from "@/interfaces/identity/identity-repository.interface";

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

export type BranchOption = { id: string; name: string; isMain: boolean };
export type EmployeeInvitation = {
  id: string;
  email: string;
  branchName: string;
  permissionKeys: string[];
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  emailSent?: boolean;
  invitationUrl?: string;
  deliveryWarning?: string;
};

async function apiFetch<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
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

export function usePermissions() {
  return useQuery({
    queryKey: ["identity", "permissions"],
    queryFn: () => apiFetch<PermissionRecord[]>("/api/identity/permissions")
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["identity", "roles"],
    queryFn: () => apiFetch<RoleRecord[]>("/api/identity/roles")
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["identity", "users"],
    queryFn: () => apiFetch<UserRecord[]>("/api/identity/users")
  });
}

export function useBranches() {
  return useQuery({
    queryKey: ["identity", "branches"],
    queryFn: () => apiFetch<BranchOption[]>("/api/identity/branches")
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiFetch<BranchOption>("/api/identity/branches", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["identity", "branches"] })
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRoleDTO) =>
      apiFetch<RoleRecord>("/api/identity/roles", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity", "roles"] });
    }
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserDTO) =>
      apiFetch<UserRecord>("/api/identity/users", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity", "users"] });
    }
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: ["identity", "invitations"],
    queryFn: () => apiFetch<EmployeeInvitation[]>("/api/identity/invitations")
  });
}

export function useInviteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InviteEmployeeDTO) => apiFetch<EmployeeInvitation>("/api/identity/invitations", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["identity", "invitations"] })
  });
}
