import { z } from "zod";

import {
  createRoleSchema,
  createUserSchema,
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerOwnerSchema
} from "@/schemas/identity/auth.schemas";

export type LoginDTO = z.infer<typeof loginSchema>;
export type RegisterOwnerDTO = z.infer<typeof registerOwnerSchema>;
export type PasswordResetRequestDTO = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmDTO = z.infer<typeof passwordResetConfirmSchema>;
export type CreateRoleDTO = z.infer<typeof createRoleSchema>;
export type CreateUserDTO = z.infer<typeof createUserSchema>;

export type AuthenticatedUserDTO = {
  id: string;
  name: string;
  email: string;
  currentTenantId: string;
  currentTenantName: string;
  currentBranchId?: string | null;
  currentBranchName?: string | null;
  roleId: string;
  roleName: string;
  permissions: string[];
};
