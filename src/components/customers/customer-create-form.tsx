"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";

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

const emptyCustomer: UpdateCustomerDTO = {
  name: "", document: "", email: "", phone: "", whatsapp: "", address: "", street: "", addressNumber: "", complement: "", district: "", city: "", cityCode: "", state: "", zipCode: "", stateRegistration: "",
  creditLimit: 0, notes: "", tags: [], status: "ACTIVE"
};

const states = [["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"]];
const customerProfiles = ["Cliente recorrente", "Cliente de banho e tosa", "Compra ração", "Compra medicamentos", "Tutor de filhote", "Cliente com atendimento especial"];

export function CustomerCreateForm({ customer, onCancel, onSuccess }: CustomerFormProps) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const [error, setError] = useState<string | null>(null);
  const [tagsText, setTagsText] = useState("");
  const form = useForm<UpdateCustomerDTO>({
    resolver: zodResolver(updateCustomerSchema),
    defaultValues: emptyCustomer
  });

  useEffect(() => {
    form.reset(customer ? ({
      ...customer,
      birthDate: customer.birthDate ? customer.birthDate.slice(0, 10) : undefined,
      status: customer.status as UpdateCustomerDTO["status"]
    } as unknown as UpdateCustomerDTO) : emptyCustomer);
    setTagsText(customer?.tags[0] ?? "");
    setError(null);
  }, [customer, form]);

  async function onSubmit(values: UpdateCustomerDTO) {
    setError(null);

    try {
      const payload = {
        ...values,
        tags: tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      };
      let savedCustomer: CustomerListItemDTO;
      if (customer) {
        savedCustomer = await updateCustomer.mutateAsync({ id: customer.id, payload });
      } else {
        savedCustomer = await createCustomer.mutateAsync(payload);
        form.reset(emptyCustomer);
        setTagsText("");
      }
      onSuccess?.(savedCustomer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar o cliente.");
    }
  }

  function onInvalid(errors: FieldErrors<UpdateCustomerDTO>) {
    const firstError = Object.values(errors).find((fieldError) => fieldError?.message);
    setError(typeof firstError?.message === "string"
      ? firstError.message
      : "Revise os campos destacados antes de cadastrar o cliente.");
  }

  return (
    <div>
      <form className="erp-form space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        <Input label="Nome completo" mask="letters" error={form.formState.errors.name?.message} {...form.register("name")} />
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Documento" help="Informe o Cadastro de Pessoa Física ou o Cadastro Nacional da Pessoa Jurídica. A pontuação é colocada automaticamente." mask="document" error={form.formState.errors.document?.message} {...form.register("document")} />
          <Input label="E-mail" type="email" error={form.formState.errors.email?.message} {...form.register("email")} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Telefone" mask="phone" error={form.formState.errors.phone?.message} {...form.register("phone")} />
          <Input label="Telefone para WhatsApp" help="Número usado para mensagens e campanhas pelo WhatsApp." mask="phone" error={form.formState.errors.whatsapp?.message} {...form.register("whatsapp")} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Logradouro" help="Rua, avenida ou estrada usada no endereço fiscal." error={form.formState.errors.street?.message} {...form.register("street")} />
          <Input label="Número do endereço" error={form.formState.errors.addressNumber?.message} {...form.register("addressNumber")} />
          <Input label="Complemento" error={form.formState.errors.complement?.message} {...form.register("complement")} />
          <Input label="Bairro" error={form.formState.errors.district?.message} {...form.register("district")} />
          <Input label="Município" mask="letters" error={form.formState.errors.city?.message} {...form.register("city")} />
          <Input label="Código do município" help="Código de sete números do Instituto Brasileiro de Geografia e Estatística, necessário para a Nota Fiscal Eletrônica." mask="integer" maxLength={7} error={form.formState.errors.cityCode?.message} {...form.register("cityCode")} />
          <Select label="Estado" error={form.formState.errors.state?.message} {...form.register("state")}><option value="">Selecione o estado</option>{states.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
          <Input label="Código de Endereçamento Postal" mask="integer" maxLength={8} error={form.formState.errors.zipCode?.message} {...form.register("zipCode")} />
        </div>
        <Input label="Inscrição Estadual" help="Preencha apenas quando o cliente for empresa contribuinte do imposto estadual." mask="integer" error={form.formState.errors.stateRegistration?.message} {...form.register("stateRegistration")} />
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Data de nascimento"
            type="date"
            error={form.formState.errors.birthDate?.message}
            {...form.register("birthDate")}
          />
          <Input
            label="Limite de crédito"
            help="Valor máximo permitido para compras que serão pagas depois. Use zero quando não houver crédito da loja."
            mask="currency"
            error={form.formState.errors.creditLimit?.message}
            {...form.register("creditLimit")}
          />
        </div>
        <Select label="Perfil do cliente" help="Classificação usada para localizar clientes e preparar campanhas." value={tagsText} onChange={(event) => setTagsText(event.target.value)}><option value="">Sem classificação</option>{customerProfiles.map((profile) => <option key={profile}>{profile}</option>)}</Select>
        <Input label="Observações" error={form.formState.errors.notes?.message} {...form.register("notes")} />
        {customer ? (
          <Select label="Status" error={form.formState.errors.status?.message} {...form.register("status")}>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
            <option value="BLOCKED">Bloqueado</option>
          </Select>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="erp-form-actions sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-white/95 px-4 pb-1 pt-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:p-0">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" className="sm:min-w-48" disabled={createCustomer.isPending || updateCustomer.isPending}>
            <Save size={18} />
            {createCustomer.isPending || updateCustomer.isPending ? "Salvando..." : customer ? "Salvar alterações" : "Cadastrar cliente"}
          </Button>
        </div>
      </form>
    </div>
  );
}
