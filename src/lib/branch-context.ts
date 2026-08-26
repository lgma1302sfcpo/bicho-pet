import { AppError } from "@/lib/errors";

export function requireSelectedBranch(branchId?: string | null) {
  if (!branchId) {
    throw new AppError(
      "Selecione uma loja especifica antes de cadastrar ou movimentar dados.",
      "BRANCH_REQUIRED",
      422
    );
  }

  return branchId;
}
