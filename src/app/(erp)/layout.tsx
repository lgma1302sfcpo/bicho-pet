import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ErpShell } from "@/components/layout/erp-shell";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ErpLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  const branches = await prisma.branch.findMany({
    where: {
      tenantId: session.user.currentTenantId,
      status: "ACTIVE",
      ...(session.user.canAccessAllBranches
        ? {}
        : { id: session.user.currentBranchId ?? "" })
    },
    select: { id: true, name: true, isMain: true },
    orderBy: [{ isMain: "desc" }, { name: "asc" }]
  });

  return <ErpShell user={session.user} branches={branches}>{children}</ErpShell>;
}
