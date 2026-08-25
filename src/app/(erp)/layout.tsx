import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ErpShell } from "@/components/layout/erp-shell";
import { getCurrentSession } from "@/lib/auth";

export default async function ErpLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <ErpShell user={session.user}>{children}</ErpShell>;
}
