import { CustomerEngagementPage } from "@/components/customers/customer-engagement-page";
import { AUTH_PERMISSIONS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function CustomersPage() {
  const session = await requirePagePermission(AUTH_PERMISSIONS.CUSTOMERS_READ);
  const hasWritePermission = hasPermission(session.user.permissions, AUTH_PERMISSIONS.CUSTOMERS_WRITE);
  const branches = session.user.canAccessAllBranches
    ? await prisma.branch.findMany({
        where: { tenantId: session.user.currentTenantId, status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: [{ isMain: "desc" }, { name: "asc" }]
      })
    : [];

  return (
    <CustomerEngagementPage
      canManage={hasWritePermission && Boolean(session.user.currentBranchId)}
      canAssignBranches={hasWritePermission && session.user.canAccessAllBranches && !session.user.currentBranchId}
      branches={branches}
    />
  );
}
