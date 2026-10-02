import { db } from "@/server/db";

export async function resolveTenantMembership(userId: string, slug: string) {
  const membership = await db.membership.findFirst({
    where: { userId, business: { slug } },
    include: { business: true },
  });
  return membership ? { business: membership.business, role: membership.role } : null;
}

export async function listUserBusinesses(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId }, include: { business: true }, orderBy: { business: { name: "asc" } },
  });
  return memberships.map(({ business, role }) => ({ business, role }));
}
