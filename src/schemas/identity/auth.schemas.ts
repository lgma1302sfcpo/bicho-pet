import { z } from "zod";

import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { onlyDigits } from "@/lib/utils";

const passwordSchema = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .regex(/[A-Za-z]/, "Inclua letras.")
  .regex(/\d/, "Inclua números.");

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
  identifier: z.string().trim().min(1, "Informe seu usuário ou e-mail.").toLowerCase(),
  password: z.string().min(1, "Informe a senha.")
});

export const registerOwnerSchema = z
  .object({
    companyName: z.string().trim().min(2, "Informe o nome da empresa."),
    companyDocument: documentSchema,
    ownerName: z.string().trim().min(2, "Informe seu nome."),
    email: z.string().trim().email("Informe um e-mail válido.").toLowerCase(),
    phone: optionalPhoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem."
  });

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").toLowerCase()
});

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().trim().min(32, "Token inválido."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem."
  });

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cargo."),
  description: z.string().trim().max(240).optional(),
  permissionKeys: z
    .array(z.nativeEnum(AUTH_PERMISSIONS))
    .min(1, "Selecione pelo menos uma permissão.")
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do usuário."),
  email: z.string().trim().email("Informe um e-mail válido.").toLowerCase(),
  phone: optionalPhoneSchema,
  password: passwordSchema,
  roleId: z.string().trim().min(1, "Selecione um cargo."),
  branchId: z.string().trim().min(1, "Selecione uma loja.")
});

export const createEmployeeUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do funcionário."),
  username: z
    .string()
    .trim()
    .min(3, "Use pelo menos 3 caracteres no usuário.")
    .max(40, "Use no máximo 40 caracteres no usuário.")
    .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou sublinhado.")
    .toLowerCase(),
  password: passwordSchema,
  branchId: z.string().trim().min(1, "Selecione uma loja."),
  permissionKeys: z.array(z.nativeEnum(AUTH_PERMISSIONS)).min(1, "Selecione pelo menos um acesso.")
});

export const inviteEmployeeSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").toLowerCase(),
  branchId: z.string().trim().min(1, "Selecione uma loja."),
  permissionKeys: z.array(z.nativeEnum(AUTH_PERMISSIONS)).min(1, "Selecione pelo menos um acesso.")
});

export const acceptEmployeeInvitationSchema = z
  .object({
    token: z.string().trim().min(32, "Convite inválido."),
    name: z.string().trim().min(2, "Informe seu nome."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem."
  });
