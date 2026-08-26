import { IdentityManagement } from "@/components/identity/identity-management";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function UsersSettingsPage() {
  await requirePagePermission(AUTH_PERMISSIONS.IDENTITY_USERS_READ);
  return <IdentityManagement />;
}
