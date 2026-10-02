import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { resolveTenantMembership } from "@/server/tenancy/membership";
import { getTenantDb } from "@/server/tenancy/tenant-db";

export const requireTenant = cache(async (slug: string) => {
  const user = await requireUser();
  const membership = await resolveTenantMembership(user.id, slug);
  if (!membership) notFound();
  const { business, role } = membership;
  const staff = await getTenantDb(business.id).staff.findFirst({ where: { userId: user.id }, select: { id: true } });
  return {
    user,
    business: { id: business.id, name: business.name, slug: business.slug, timezone: business.timezone, currency: business.currency, plan: business.plan },
    role, staffId: staff?.id ?? null, db: getTenantDb(business.id),
  };
});
