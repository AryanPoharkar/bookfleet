import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { ServiceManager } from "@/features/services/components/service-manager";

export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  requirePermission(tenant, "service:manage");
  const services = await tenant.db.service.findMany({ orderBy: { name: "asc" } });
  return <Container className="py-8"><PageHeader title="Services" description="Manage what customers can book." /><div className="mt-8"><ServiceManager slug={slug} currency={tenant.business.currency} services={services} /></div></Container>;
}
