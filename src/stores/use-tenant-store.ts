import { create } from "zustand";

type TenantState = {
  currentTenantId?: string;
  currentTenantName?: string;
  setTenant: (tenant: { id: string; name: string }) => void;
};

export const useTenantStore = create<TenantState>((set) => ({
  setTenant: (tenant) =>
    set({
      currentTenantId: tenant.id,
      currentTenantName: tenant.name
    })
}));
