"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Plus, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CreateRoleDTO, CreateUserDTO } from "@/dtos/identity/auth.dto";
import {
  useCreateRole,
  useCreateUser,
  usePermissions,
  useRoles,
  useUsers
} from "@/hooks/identity/use-identity";
import { createRoleSchema, createUserSchema } from "@/schemas/identity/auth.schemas";

export function IdentityManagement() {
  const permissionsQuery = usePermissions();
  const rolesQuery = useRoles();
  const usersQuery = useUsers();
  const createRole = useCreateRole();
  const createUser = useCreateUser();
  const [roleError, setRoleError] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const permissions = permissionsQuery.data;

  const roleForm = useForm<CreateRoleDTO>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      description: "",
      permissionKeys: []
    }
  });
  const userForm = useForm<CreateUserDTO>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      roleId: "",
      branchId: ""
    }
  });

  const permissionsByModule = useMemo(() => {
    const map = new Map<string, NonNullable<typeof permissions>>();

    for (const permission of permissions ?? []) {
      const current = map.get(permission.module) ?? [];
      current.push(permission);
      map.set(permission.module, current);
    }

    return Array.from(map.entries());
  }, [permissions]);

  const selectedPermissions = roleForm.watch("permissionKeys") ?? [];

  function togglePermission(key: CreateRoleDTO["permissionKeys"][number]) {
    const next = selectedPermissions.includes(key)
      ? selectedPermissions.filter((item) => item !== key)
      : [...selectedPermissions, key];

    roleForm.setValue("permissionKeys", next as CreateRoleDTO["permissionKeys"], {
      shouldDirty: true,
      shouldValidate: true
    });
  }

  async function submitRole(values: CreateRoleDTO) {
    setRoleError(null);
    try {
      await createRole.mutateAsync(values);
      roleForm.reset({ name: "", description: "", permissionKeys: [] });
    } catch (error) {
      setRoleError(error instanceof Error ? error.message : "Nao foi possivel criar o cargo.");
    }
  }

  async function submitUser(values: CreateUserDTO) {
    setUserError(null);
    try {
      await createUser.mutateAsync({
        ...values,
        branchId: values.branchId || undefined
      });
      userForm.reset({ name: "", email: "", phone: "", password: "", roleId: "", branchId: "" });
    } catch (error) {
      setUserError(error instanceof Error ? error.message : "Nao foi possivel criar o usuario.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Usuarios e permissoes</h1>
          <p className="text-sm text-subdued">Controle de acesso por empresa, cargo e permissao.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            permissionsQuery.refetch();
            rolesQuery.refetch();
            usersQuery.refetch();
          }}
        >
          <RefreshCw size={18} />
          Atualizar
        </Button>
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold">Usuarios</h2>
            <p className="text-sm text-subdued">Vinculados a cargos da empresa ativa.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-subdued">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Filial</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(usersQuery.data ?? []).map((user) => (
                  <tr key={`${user.id}-${user.roleId}`}>
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-subdued">{user.email}</td>
                    <td className="px-4 py-3">{user.roleName}</td>
                    <td className="px-4 py-3">{user.branchName ?? "Todas"}</td>
                    <td className="px-4 py-3">
                      <Badge className="border-emerald-200 bg-emerald-50 text-success">{user.status}</Badge>
                    </td>
                  </tr>
                ))}
                {usersQuery.data?.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-subdued" colSpan={5}>
                      Nenhum usuario cadastrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Novo usuario</h2>
            <p className="text-sm text-subdued">Cria acesso com senha inicial.</p>
          </div>
          <form className="space-y-3" onSubmit={userForm.handleSubmit(submitUser)}>
            <Input label="Nome" error={userForm.formState.errors.name?.message} {...userForm.register("name")} />
            <Input
              label="Email"
              type="email"
              error={userForm.formState.errors.email?.message}
              {...userForm.register("email")}
            />
            <Input label="Telefone" error={userForm.formState.errors.phone?.message} {...userForm.register("phone")} />
            <Input
              label="Senha inicial"
              type="password"
              error={userForm.formState.errors.password?.message}
              {...userForm.register("password")}
            />
            <Select label="Cargo" error={userForm.formState.errors.roleId?.message} {...userForm.register("roleId")}>
              <option value="">Selecione</option>
              {(rolesQuery.data ?? []).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
            {userError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {userError}
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={createUser.isPending}>
              <UserPlus size={18} />
              Criar usuario
            </Button>
          </form>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-4">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Novo cargo</h2>
            <p className="text-sm text-subdued">Selecione permissoes para montar o perfil.</p>
          </div>
          <form className="space-y-4" onSubmit={roleForm.handleSubmit(submitRole)}>
            <Input label="Cargo" error={roleForm.formState.errors.name?.message} {...roleForm.register("name")} />
            <Input
              label="Descricao"
              error={roleForm.formState.errors.description?.message}
              {...roleForm.register("description")}
            />
            <div className="space-y-3">
              {permissionsByModule.map(([module, permissions]) => (
                <div key={module} className="rounded-md border border-border p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-subdued">{module}</p>
                  <div className="grid gap-2">
                    {permissions.map((permission) => {
                      const permissionKey = permission.key as CreateRoleDTO["permissionKeys"][number];
                      const checked = selectedPermissions.includes(permissionKey);
                      return (
                        <button
                          key={permission.key}
                          type="button"
                          className="flex items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => togglePermission(permissionKey)}
                        >
                          <span className="mt-0.5 grid h-4 w-4 place-items-center rounded border border-border bg-white">
                            {checked ? <Check size={12} className="text-success" /> : null}
                          </span>
                          <span>
                            <span className="block font-medium">{permission.name}</span>
                            <span className="block text-xs text-subdued">{permission.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {roleForm.formState.errors.permissionKeys?.message ? (
              <p className="text-xs font-medium text-danger">{roleForm.formState.errors.permissionKeys.message}</p>
            ) : null}
            {roleError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {roleError}
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={createRole.isPending}>
              <Plus size={18} />
              Criar cargo
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold">Cargos</h2>
            <p className="text-sm text-subdued">Permissoes efetivas por perfil de acesso.</p>
          </div>
          <div className="divide-y divide-border">
            {(rolesQuery.data ?? []).map((role) => (
              <div key={role.id} className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-brand-700" />
                      <h3 className="font-semibold">{role.name}</h3>
                      {role.isSystem ? <Badge>Sistema</Badge> : null}
                    </div>
                    {role.description ? <p className="mt-1 text-sm text-subdued">{role.description}</p> : null}
                  </div>
                  <Badge>{role.permissions.length} permissoes</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {role.permissions.map((permission) => (
                    <Badge key={permission.key} className="bg-white">
                      {permission.key}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
