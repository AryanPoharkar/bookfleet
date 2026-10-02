import { Users, Scissors } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/layout/container";
import { requireTenant } from "@/server/tenancy/require-tenant";

export default async function TenantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  const [services, staff] = await Promise.all([
    tenant.db.service.count({ where: { isActive: true } }),
    tenant.db.staff.count({ where: { isActive: true } }),
  ]);
  return <Container className="py-8 sm:py-10"><PageHeader title={tenant.business.name} description="Your booking workspace at a glance." actions={<Badge variant="secondary">{tenant.role}</Badge>} /><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-border bg-card p-6"><Scissors className="size-5 text-primary" /><p className="mt-4 text-3xl font-heading font-semibold">{services}</p><p className="text-small text-muted-foreground">Active services</p></div><div className="rounded-xl border border-border bg-card p-6"><Users className="size-5 text-primary" /><p className="mt-4 text-3xl font-heading font-semibold">{staff}</p><p className="text-small text-muted-foreground">Active staff</p></div></div>{tenant.role === "STAFF" && tenant.staffId === null ? <div className="mt-8"><EmptyState icon={Users} title="Your account isn't linked to a staff profile yet." description="Ask the owner to link you." /></div> : null}<p className="mt-10 text-xs text-muted-foreground">Overview details will expand in chunk 10.</p></Container>;
}
