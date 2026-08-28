"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, KeyRound, Plus, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CreateEmployeeUserDTO, CreateRoleDTO } from "@/dtos/identity/auth.dto";
import {
  useBranches,
  useCreateBranch,
  useCreateRole,
  useCreateUser,
  usePermissions,
  useRoles,
  useUsers
} from "@/hooks/identity/use-identity";
import type { PermissionKey } from "@/lib/permissions";
import { loginNameFromEmail } from "@/lib/employee-login";
import { createEmployeeUserSchema, createRoleSchema } from "@/schemas/identity/auth.schemas";

const moduleLabels: Record<string, string> = {
  dashboard: "Visão geral", customers: "Clientes", products: "Produtos", inventory: "Estoque",
  sales: "Vendas e ponto de venda", finance: "Financeiro", reports: "Relatórios", fiscal: "Fiscal",
  identity: "Usuários", settings: "Configurações", audit: "Auditoria"
};

export function IdentityManagement() {
  const router = useRouter();
  const permissionsQuery = usePermissions();
  const rolesQuery = useRoles();
  const usersQuery = useUsers();
  const branchesQuery = useBranches();
  const createBranch = useCreateBranch();
  const createRole = useCreateRole();
  const createEmployee = useCreateUser();
  const [roleError, setRoleError] = useState<string | null>(null);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchError, setBranchError] = useState<string | null>(null);
  const [employeeSuccess, setEmployeeSuccess] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ name: string; email: string; password: string } | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const roleForm = useForm<CreateRoleDTO>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: "", description: "", permissionKeys: [] }
  });
  const employeeForm = useForm<CreateEmployeeUserDTO>({
    resolver: zodResolver(createEmployeeUserSchema),
    defaultValues: { name: "", username: "", password: "", branchId: "", permissionKeys: [] }
  });

  const permissionsByModule = (() => {
    const groups = new Map<string, NonNullable<typeof permissionsQuery.data>>();
    for (const permission of permissionsQuery.data ?? []) {
      groups.set(permission.module, [...(groups.get(permission.module) ?? []), permission]);
    }
    return Array.from(groups.entries());
  })();

  function toggleRolePermission(key: CreateRoleDTO["permissionKeys"][number]) {
    const current = roleForm.getValues("permissionKeys");
    roleForm.setValue("permissionKeys", current.includes(key) ? current.filter((item) => item !== key) : [...current, key], { shouldValidate: true });
  }

  function toggleEmployeePermission(key: CreateEmployeeUserDTO["permissionKeys"][number]) {
    const current = employeeForm.getValues("permissionKeys");
    employeeForm.setValue("permissionKeys", current.includes(key) ? current.filter((item) => item !== key) : [...current, key], { shouldValidate: true });
  }

  async function submitEmployee(values: CreateEmployeeUserDTO) {
    setEmployeeError(null);
    setEmployeeSuccess(null);
    try {
      await createEmployee.mutateAsync(values);
      setEmployeeSuccess(`Funcionário ${values.name} cadastrado. Ele já pode entrar com o usuário ${values.username}.`);
      employeeForm.reset({ name: "", username: "", password: "", branchId: "", permissionKeys: [] });
    } catch (error) {
      setEmployeeError(error instanceof Error ? error.message : "Não foi possível cadastrar o funcionário.");
    }
  }

  async function submitBranch() {
    setBranchError(null);
    try {
      await createBranch.mutateAsync(branchName);
      setBranchName("");
      router.refresh();
    } catch (error) {
      setBranchError(error instanceof Error ? error.message : "Não foi possível cadastrar a loja.");
    }
  }

  async function submitRole(values: CreateRoleDTO) {
    setRoleError(null);
    try {
      await createRole.mutateAsync(values);
      roleForm.reset({ name: "", description: "", permissionKeys: [] });
    } catch (error) {
      setRoleError(error instanceof Error ? error.message : "Não foi possível criar o cargo.");
    }
  }

  async function resetUserPassword(user: { id: string; name: string; email: string }) {
    if (!window.confirm(`Gerar uma nova senha temporária para ${user.name}?`)) return;
    setResetError(null);
    setResetResult(null);
    try {
      const response = await fetch(`/api/identity/users/${user.id}/reset-password`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Não foi possível redefinir a senha.");
      setResetResult({ name: payload.data.user.name, email: payload.data.user.email, password: payload.data.temporaryPassword });
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "Não foi possível redefinir a senha.");
    }
  }

  function permissionPicker(selected: string[], toggle: (key: PermissionKey) => void) {
    return <div className="max-h-80 space-y-3 overflow-y-auto rounded-md border border-border p-3">{permissionsByModule.map(([module, permissions]) => <div key={module}><p className="mb-1 text-xs font-semibold uppercase text-subdued">{moduleLabels[module] ?? module}</p><div className="space-y-1">{permissions.map((permission) => { const checked = selected.includes(permission.key); return <button key={permission.key} type="button" className={`flex w-full items-start gap-2 rounded-md border px-2 py-2 text-left text-xs ${checked ? "border-brand-300 bg-brand-50" : "border-border"}`} onClick={() => toggle(permission.key as PermissionKey)}><span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${checked ? "border-brand-600 bg-brand-600 text-white" : "border-border"}`}>{checked ? <Check size={12}/> : null}</span><span><strong className="block text-ink">{permission.name}</strong><span className="text-subdued">{permission.description}</span></span></button>; })}</div></div>)}</div>;
  }

  return <div className="erp-page">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-semibold">Usuários e permissões</h1><p className="text-sm text-subdued">O proprietário controla lojas, usuários e acessos dos funcionários.</p></div><Button variant="secondary" onClick={() => { void permissionsQuery.refetch(); void rolesQuery.refetch(); void usersQuery.refetch(); void branchesQuery.refetch(); }}><RefreshCw size={18}/>Atualizar</Button></div>

    <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
      <Card className="overflow-hidden">{resetResult ? <div className="m-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-semibold">Senha temporária de {resetResult.name}</p><p className="mt-1">Envie ao usuário <strong>{loginNameFromEmail(resetResult.email)}</strong>:</p><p className="mt-2 select-all rounded bg-white px-3 py-2 font-mono font-semibold">{resetResult.password}</p><p className="mt-2 text-amber-900">Peça ao funcionário para alterar a senha após entrar.</p></div> : null}{resetError ? <p className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{resetError}</p> : null}<div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Pessoas com acesso</h2><p className="text-sm text-subdued">Funcionários ativos e a loja atribuída a cada um.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted text-xs uppercase text-subdued"><tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Usuário ou e-mail</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Loja</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3">Ações</th></tr></thead><tbody className="divide-y divide-border">{(usersQuery.data ?? []).map((user) => <tr key={`${user.id}-${user.roleId}`}><td className="px-4 py-3 font-medium">{user.name}</td><td className="px-4 py-3 text-subdued">{loginNameFromEmail(user.email)}</td><td className="px-4 py-3">{user.roleName}</td><td className="px-4 py-3">{user.branchName ?? "Todas as lojas"}</td><td className="px-4 py-3"><Badge>{user.status === "ACTIVE" ? "Ativo" : user.status}</Badge></td><td className="px-4 py-3"><Button variant="secondary" onClick={() => void resetUserPassword(user)}><KeyRound size={16}/>Redefinir senha</Button></td></tr>)}{usersQuery.data?.length === 0 ? <tr><td className="px-4 py-6 text-center text-subdued" colSpan={6}>Nenhum usuário cadastrado.</td></tr> : null}</tbody></table></div></Card>

      <Card className="p-4"><div className="mb-4"><h2 className="font-semibold">Cadastrar funcionário</h2><p className="text-sm text-subdued">Crie o usuário e a senha diretamente, sem precisar de e-mail.</p></div><form className="space-y-3" noValidate onSubmit={employeeForm.handleSubmit(submitEmployee)}><Input label="Nome do funcionário" error={employeeForm.formState.errors.name?.message} {...employeeForm.register("name")}/><Input label="Usuário" help="Nome usado para entrar no sistema. Use apenas letras, números, ponto, hífen ou sublinhado." autoComplete="off" error={employeeForm.formState.errors.username?.message} {...employeeForm.register("username")}/><Input label="Senha inicial" type="password" autoComplete="new-password" error={employeeForm.formState.errors.password?.message} {...employeeForm.register("password")}/><Select label="Loja" help="Esse login verá somente os dados operacionais da loja selecionada." error={employeeForm.formState.errors.branchId?.message} {...employeeForm.register("branchId")}><option value="">Selecione</option>{(branchesQuery.data ?? []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.isMain ? " (principal)" : ""}</option>)}</Select><div><p className="mb-2 text-sm font-medium">O que poderá acessar</p>{permissionPicker(employeeForm.watch("permissionKeys"), toggleEmployeePermission)}{employeeForm.formState.errors.permissionKeys?.message ? <p className="mt-1 text-xs text-danger">{employeeForm.formState.errors.permissionKeys.message}</p> : null}</div>{employeeError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{employeeError}</p> : null}{employeeSuccess ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-success">{employeeSuccess}</p> : null}<Button className="w-full" type="submit" disabled={createEmployee.isPending}><UserPlus size={18}/>{createEmployee.isPending ? "Cadastrando..." : "Cadastrar funcionário"}</Button></form></Card>
    </section>

    <Card className="p-4"><div className="mb-4"><h2 className="font-semibold">Lojas</h2><p className="text-sm text-subdued">Cada loja possui estoque, vendas, caixa e relatórios separados.</p></div><div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"><Input label="Nome da nova loja" placeholder="Exemplo: Loja Tupi" value={branchName} onChange={(event) => setBranchName(event.target.value)}/><Button type="button" disabled={createBranch.isPending || branchName.trim().length < 2} onClick={() => void submitBranch()}><Plus size={18}/>Cadastrar loja</Button></div>{branchError ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{branchError}</p> : null}<div className="mt-4 flex flex-wrap gap-2">{(branchesQuery.data ?? []).map((branch) => <Badge key={branch.id}>{branch.name}{branch.isMain ? " — principal" : ""}</Badge>)}</div></Card>

    <section className="grid gap-5 2xl:grid-cols-[minmax(22rem,0.85fr)_minmax(0,1.15fr)]">
      <Card className="p-4"><div className="mb-4"><h2 className="font-semibold">Novo perfil de acesso</h2><p className="text-sm text-subdued">Crie perfis reutilizáveis, como Caixa ou Gerente.</p></div><form className="space-y-3" onSubmit={roleForm.handleSubmit(submitRole)}><Input label="Nome do perfil" error={roleForm.formState.errors.name?.message} {...roleForm.register("name")}/><Input label="Descrição" error={roleForm.formState.errors.description?.message} {...roleForm.register("description")}/>{permissionPicker(roleForm.watch("permissionKeys"), toggleRolePermission)}{roleForm.formState.errors.permissionKeys?.message ? <p className="text-xs text-danger">{roleForm.formState.errors.permissionKeys.message}</p> : null}{roleError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{roleError}</p> : null}<Button className="w-full" type="submit" disabled={createRole.isPending}><Plus size={18}/>Criar perfil</Button></form></Card>
      <Card className="overflow-hidden"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Perfis cadastrados</h2><p className="text-sm text-subdued">Conjuntos de permissões disponíveis na empresa.</p></div><div className="divide-y divide-border">{(rolesQuery.data ?? []).map((role) => <div key={role.id} className="p-4"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-brand-700"/><h3 className="font-semibold">{role.name}</h3>{role.isSystem ? <Badge>Sistema</Badge> : null}</div>{role.description ? <p className="mt-1 text-sm text-subdued">{role.description}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{role.permissions.map((permission) => <Badge key={permission.key} className="bg-white">{permission.name}</Badge>)}</div></div>)}</div></Card>
    </section>
  </div>;
}
