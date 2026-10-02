// TEMPORARY - replaced in chunk 6
import Link from "next/link";
import { requireTenant } from "@/server/tenancy/require-tenant";

export default async function TenantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  return <main className="mx-auto max-w-[1120px] px-5 py-12"><p className="text-sm text-muted-foreground">{tenant.role}</p><h1 className="mt-2 font-heading text-4xl font-semibold">{tenant.business.name}</h1><Link className="mt-6 inline-block underline" href={`/app/${slug}/members`}>Members</Link></main>;
}
