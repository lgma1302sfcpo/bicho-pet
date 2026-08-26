import { z } from "zod";

import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { onlyDigits } from "@/lib/utils";

const passwordSchema = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .regex(/[A-Za-z]/, "Inclua letras.")
  .regex(/\d/, "Inclua numeros.");

const documentSchema = z
  .string()
  .min(11, "Informe CPF ou CNPJ.")
  .max(18, "Documento muito longo.")
  .transform(onlyDigits)
  .refine((value) => value.length === 11 || value.length === 14, "Informe CPF ou CNPJ valido.");

const optionalPhoneSchema = z
  .string()
  .optional()
  .transform((value) => (value ? onlyDigits(value) : undefined));

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um email valido.").toLowerCase(),
  password: z.string().min(1, "Informe a senha.")
});

export const registerOwnerSchema = z
  .object({
    companyName: z.string().trim().min(2, "Informe o nome da empresa."),
    companyDocument: documentSchema,
    ownerName: z.string().trim().min(2, "Informe seu nome."),
    email: z.string().trim().email("Informe um email valido.").toLowerCase(),
    phone: optionalPhoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas nao conferem."
  });

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email("Informe um email valido.").toLowerCase()
});

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().trim().min(32, "Token invalido."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas nao conferem."
  });

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cargo."),
  description: z.string().trim().max(240).optional(),
  permissionKeys: z
    .array(z.nativeEnum(AUTH_PERMISSIONS))
    .min(1, "Selecione pelo menos uma permissao.")
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do usuario."),
  email: z.string().trim().email("Informe um email valido.").toLowerCase(),
  phone: optionalPhoneSchema,
  password: passwordSchema,
  roleId: z.string().trim().min(1, "Selecione um cargo."),
  branchId: z.string().trim().min(1, "Selecione uma loja.")
});

export const inviteEmployeeSchema = z.object({
  email: z.string().trim().email("Informe um email valido.").toLowerCase(),
  branchId: z.string().trim().min(1, "Selecione uma loja."),
  permissionKeys: z.array(z.nativeEnum(AUTH_PERMISSIONS)).min(1, "Selecione pelo menos um acesso.")
});

export const acceptEmployeeInvitationSchema = z
  .object({
    token: z.string().trim().min(32, "Convite invalido."),
    name: z.string().trim().min(2, "Informe seu nome."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas nao conferem."
  });
