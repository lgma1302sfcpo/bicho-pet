"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CustomerListItemDTO, UpdateCustomerDTO } from "@/dtos/commerce/customer.dto";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/commerce/use-commerce";
import { updateCustomerSchema } from "@/schemas/commerce/customer.schemas";

type CustomerFormProps = {
  customer?: CustomerListItemDTO | null;
  onCancel?: () => void;
  onSuccess?: (customer: CustomerListItemDTO) => void;
};

const emptyPet = {
  name: "", species: "DOG" as const, sex: "MALE" as const, breed: "", birthDate: undefined, notes: ""
};

const emptyCustomer: UpdateCustomerDTO = {
  name: "", document: "", email: "", phone: "", whatsapp: "", birthDate: undefined, address: "", street: "", addressNumber: "", complement: "", district: "", city: "", cityCode: "", state: "", zipCode: "", stateRegistration: "",
  creditLimit: 0, notes: "", tags: [], pets: [{ ...emptyPet }], status: "ACTIVE"
};

const states = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"]
];

function customerDefaults(customer?: CustomerListItemDTO | null): UpdateCustomerDTO {
  if (!customer) return { ...emptyCustomer, pets: [{ ...emptyPet }] };
  return {
    name: customer.name,
    document: customer.document ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    whatsapp: customer.whatsapp ?? "",
    birthDate: customer.birthDate ? customer.birthDate.slice(0, 10) as unknown as Date : undefined,
    address: customer.address ?? "",
    street: customer.street ?? "",
    addressNumber: customer.addressNumber ?? "",
    complement: customer.complement ?? "",
    district: customer.district ?? "",
    city: customer.city ?? "",
    cityCode: customer.cityCode ?? "",
    state: customer.state ?? "",
    zipCode: customer.zipCode ?? "",
    stateRegistration: customer.stateRegistration ?? "",
    creditLimit: customer.creditLimit,
    notes: customer.notes ?? "",
    tags: customer.tags,
    pets: customer.pets?.length ? customer.pets.map((pet) => ({
      name: pet.name,
      species: pet.species,
      sex: pet.sex,
      breed: pet.breed ?? "",
      birthDate: pet.birthDate ? String(pet.birthDate).slice(0, 10) as unknown as Date : undefined,
      notes: pet.notes ?? ""
    })) : [{ ...emptyPet }],
    status: customer.status as UpdateCustomerDTO["status"]
  };
}

export function CustomerCreateForm({ customer, onCancel, onSuccess }: CustomerFormProps) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<UpdateCustomerDTO>({ resolver: zodResolver(updateCustomerSchema), defaultValues: customerDefaults(customer) });
  const pets = useFieldArray({ control: form.control, name: "pets" });

  useEffect(() => {
    form.reset(customerDefaults(customer));
    setError(null);
  }, [customer, form]);

  async function onSubmit(values: UpdateCustomerDTO) {
    setError(null);
    try {
      const payload: UpdateCustomerDTO = {
        ...values,
        email: customer?.email || undefined,
        phone: customer?.phone || undefined,
        creditLimit: customer?.creditLimit ?? 0,
        notes: customer?.notes || undefined,
        tags: customer?.tags ?? [],
        status: (customer?.status as UpdateCustomerDTO["status"] | undefined) ?? "ACTIVE"
      };
      const savedCustomer = customer
        ? await updateCustomer.mutateAsync({ id: customer.id, payload })
        : await createCustomer.mutateAsync(payload);
      if (!customer) form.reset(customerDefaults(null));
      onSuccess?.(savedCustomer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar o cliente.");
    }
  }

  function onInvalid() {
    setError("Revise os campos destacados antes de cadastrar o cliente.");
  }

  return (
    <div>
      <form className="erp-form space-y-5" noValidate onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        <section className="space-y-3">
          <div><h3 className="font-semibold text-ink">Dados do cliente</h3><p className="text-xs text-subdued">Informações essenciais para atendimento e contato.</p></div>
          <Input label="Nome completo" mask="letters" error={form.formState.errors.name?.message} {...form.register("name")} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Telefone WhatsApp" help="Número usado para contato e campanhas." mask="phone" error={form.formState.errors.whatsapp?.message} {...form.register("whatsapp")} />
            <Input label="Documento" help="CPF ou CNPJ. A pontuação é colocada automaticamente." mask="document" error={form.formState.errors.document?.message} {...form.register("document")} />
          </div>
          <Input label="Endereço" placeholder="Rua, número, bairro e cidade" error={form.formState.errors.address?.message} {...form.register("address")} />
          <Input label="Data de nascimento" type="date" error={form.formState.errors.birthDate?.message} {...form.register("birthDate")} />
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-semibold text-ink">Pets</h3><p className="text-xs text-subdued">Cadastre um ou mais pets vinculados ao cliente.</p></div>
            <Button type="button" variant="secondary" onClick={() => pets.append({ ...emptyPet })}><Plus size={17} />Adicionar outro pet</Button>
          </div>
          <div className="space-y-3">
            {pets.fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="font-medium text-ink">Pet {index + 1}</h4>
                  {pets.fields.length > 1 ? <Button type="button" variant="ghost" className="text-danger" onClick={() => pets.remove(index)}><Trash2 size={16} />Remover</Button> : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input label="Nome do pet" error={form.formState.errors.pets?.[index]?.name?.message} {...form.register(`pets.${index}.name`)} />
                  <Select label="Tipo" error={form.formState.errors.pets?.[index]?.species?.message} {...form.register(`pets.${index}.species`)}><option value="DOG">Cão</option><option value="CAT">Gato</option></Select>
                  <Select label="Sexo" error={form.formState.errors.pets?.[index]?.sex?.message} {...form.register(`pets.${index}.sex`)}><option value="MALE">Macho</option><option value="FEMALE">Fêmea</option></Select>
                  <Input label="Raça" mask="letters" error={form.formState.errors.pets?.[index]?.breed?.message} {...form.register(`pets.${index}.breed`)} />
                  <Input label="Data de nascimento" type="date" error={form.formState.errors.pets?.[index]?.birthDate?.message} {...form.register(`pets.${index}.birthDate`)} />
                  <Input label="Observação" error={form.formState.errors.pets?.[index]?.notes?.message} {...form.register(`pets.${index}.notes`)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <details className="rounded-lg border border-border bg-white p-4">
          <summary className="cursor-pointer font-semibold text-ink">Dados fiscais (opcional)</summary>
          <p className="mb-4 mt-2 text-xs text-subdued">Preencha quando precisar emitir NF-e com os dados completos do cliente.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Logradouro" error={form.formState.errors.street?.message} {...form.register("street")} />
            <Input label="Número" error={form.formState.errors.addressNumber?.message} {...form.register("addressNumber")} />
            <Input label="Complemento" error={form.formState.errors.complement?.message} {...form.register("complement")} />
            <Input label="Bairro" error={form.formState.errors.district?.message} {...form.register("district")} />
            <Input label="Município" mask="letters" error={form.formState.errors.city?.message} {...form.register("city")} />
            <Input label="Código do município" help="Código IBGE com sete números." mask="integer" maxLength={7} error={form.formState.errors.cityCode?.message} {...form.register("cityCode")} />
            <Select label="Estado" error={form.formState.errors.state?.message} {...form.register("state")}><option value="">Selecione o estado</option>{states.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
            <Input label="CEP" mask="integer" maxLength={8} error={form.formState.errors.zipCode?.message} {...form.register("zipCode")} />
            <Input label="Inscrição Estadual" help="Somente para empresa contribuinte estadual." mask="integer" error={form.formState.errors.stateRegistration?.message} {...form.register("stateRegistration")} />
          </div>
        </details>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div> : null}
        <div className="erp-form-actions sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-white/95 px-4 pb-1 pt-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:p-0">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" className="sm:min-w-48" disabled={createCustomer.isPending || updateCustomer.isPending}><Save size={18} />{createCustomer.isPending || updateCustomer.isPending ? "Salvando..." : customer ? "Salvar alterações" : "Cadastrar cliente"}</Button>
        </div>
      </form>
    </div>
  );
}
