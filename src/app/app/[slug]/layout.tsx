import { requireTenant } from "@/server/tenancy/require-tenant";
import { can } from "@/server/rbac/permissions";
import { DashboardShell } from "@/features/dashboard/components/shell";
import { NAV_ITEMS } from "@/features/dashboard/nav-items";

export default async function TenantLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  const items = NAV_ITEMS.filter((item) => (!item.permission || can(tenant.role, item.permission)) && (!item.staffOnly || tenant.staffId !== null));
  // Pages still call requireTenant themselves; a layout is not a security check.
  return <DashboardShell tenant={tenant} items={items}>{children}</DashboardShell>;
}
