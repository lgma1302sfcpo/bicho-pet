"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CustomerListItemDTO, UpdateCustomerDTO } from "@/dtos/commerce/customer.dto";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/commerce/use-commerce";
import { updateCustomerSchema } from "@/schemas/commerce/customer.schemas";

type CustomerFormProps = {
  customer?: CustomerListItemDTO | null;
  onCancel?: () => void;
};

const emptyCustomer: UpdateCustomerDTO = {
  name: "", document: "", email: "", phone: "", whatsapp: "", address: "", street: "", addressNumber: "", complement: "", district: "", city: "", cityCode: "", state: "", zipCode: "", stateRegistration: "",
  creditLimit: 0, notes: "", tags: [], status: "ACTIVE"
};

const states = [["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapa"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceara"], ["DF", "Distrito Federal"], ["ES", "Espirito Santo"], ["GO", "Goias"], ["MA", "Maranhao"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Para"], ["PB", "Paraiba"], ["PR", "Parana"], ["PE", "Pernambuco"], ["PI", "Piaui"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"], ["RO", "Rondonia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "Sao Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"]];
const customerProfiles = ["Cliente recorrente", "Cliente de banho e tosa", "Compra racao", "Compra medicamentos", "Tutor de filhote", "Cliente com atendimento especial"];

export function CustomerCreateForm({ customer, onCancel }: CustomerFormProps) {
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
      if (customer) {
        await updateCustomer.mutateAsync({ id: customer.id, payload });
        onCancel?.();
      } else {
        await createCustomer.mutateAsync(payload);
        form.reset(emptyCustomer);
        setTagsText("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel cadastrar cliente.");
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{customer ? "Editar cliente" : "Novo cliente"}</h2>
          {customer ? <Button variant="ghost" onClick={onCancel} aria-label="Cancelar edicao"><X size={18} /></Button> : null}
        </div>
        <p className="text-sm text-subdued">Cadastro para relacionamento e vendas.</p>
      </div>
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Input label="Nome completo" mask="letters" error={form.formState.errors.name?.message} {...form.register("name")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Documento" help="Informe o Cadastro de Pessoa Fisica ou o Cadastro Nacional da Pessoa Juridica. A pontuacao e colocada automaticamente." mask="document" error={form.formState.errors.document?.message} {...form.register("document")} />
          <Input label="Correio eletronico" type="email" error={form.formState.errors.email?.message} {...form.register("email")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Telefone" mask="phone" error={form.formState.errors.phone?.message} {...form.register("phone")} />
          <Input label="Telefone para WhatsApp" help="Numero usado para mensagens e campanhas pelo WhatsApp." mask="phone" error={form.formState.errors.whatsapp?.message} {...form.register("whatsapp")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Logradouro" help="Rua, avenida ou estrada usada no endereco fiscal." error={form.formState.errors.street?.message} {...form.register("street")} />
          <Input label="Numero do endereco" error={form.formState.errors.addressNumber?.message} {...form.register("addressNumber")} />
          <Input label="Complemento" error={form.formState.errors.complement?.message} {...form.register("complement")} />
          <Input label="Bairro" error={form.formState.errors.district?.message} {...form.register("district")} />
          <Input label="Municipio" mask="letters" error={form.formState.errors.city?.message} {...form.register("city")} />
          <Input label="Codigo do municipio" help="Codigo de sete numeros do Instituto Brasileiro de Geografia e Estatistica, necessario para a Nota Fiscal Eletronica." mask="integer" maxLength={7} error={form.formState.errors.cityCode?.message} {...form.register("cityCode")} />
          <Select label="Estado" error={form.formState.errors.state?.message} {...form.register("state")}><option value="">Selecione o estado</option>{states.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
          <Input label="Codigo de Enderecamento Postal" mask="integer" maxLength={8} error={form.formState.errors.zipCode?.message} {...form.register("zipCode")} />
        </div>
        <Input label="Inscricao Estadual" help="Preencha apenas quando o cliente for empresa contribuinte do imposto estadual." mask="integer" error={form.formState.errors.stateRegistration?.message} {...form.register("stateRegistration")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Data de nascimento"
            type="date"
            error={form.formState.errors.birthDate?.message}
            {...form.register("birthDate")}
          />
          <Input
            label="Limite de credito"
            help="Valor maximo permitido para compras que serao pagas depois. Use zero quando nao houver credito da loja."
            mask="currency"
            error={form.formState.errors.creditLimit?.message}
            {...form.register("creditLimit")}
          />
        </div>
        <Select label="Perfil do cliente" help="Classificacao usada para localizar clientes e preparar campanhas." value={tagsText} onChange={(event) => setTagsText(event.target.value)}><option value="">Sem classificacao</option>{customerProfiles.map((profile) => <option key={profile}>{profile}</option>)}</Select>
        <Input label="Observacoes" error={form.formState.errors.notes?.message} {...form.register("notes")} />
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

        <Button type="submit" className="w-full" disabled={createCustomer.isPending || updateCustomer.isPending}>
          <Save size={18} />
          {customer ? "Salvar alteracoes" : "Cadastrar cliente"}
        </Button>
      </form>
    </Card>
  );
}
