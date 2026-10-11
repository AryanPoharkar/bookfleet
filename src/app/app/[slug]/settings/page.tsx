import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { getAppUrl } from "@/server/app-url";
export default async function SettingsPage({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; const tenant=await requireTenant(slug); requirePermission(tenant,"settings:manage"); return <Container className="py-8 sm:py-10"><PageHeader title="Settings" description="Manage your business details and booking page."/><div className="mt-8 max-w-2xl"><SettingsForm initial={{name:tenant.business.name,timezone:tenant.business.timezone,currency:tenant.business.currency,accentColor:tenant.business.accentColor??"#1F5F4F"}} slug={slug} bookingUrl={`${getAppUrl()}/book/${slug}`}/></div></Container>; }
