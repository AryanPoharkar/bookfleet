import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { MembersManager } from "@/features/members/components/members-manager";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  requirePermission(tenant, "members:manage");
  const members = await tenant.db.membership.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const invites = await tenant.db.invite.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="mx-auto max-w-[1120px] px-5 py-12">
      <h1 className="font-heading text-4xl font-semibold">Members</h1>
      <MembersManager
        slug={slug}
        members={members.map((member) => ({
          userId: member.userId,
          name: member.user.name,
          email: member.user.email,
          role: member.role,
        }))}
        invites={invites.flatMap((invite) =>
          invite.role === "OWNER"
            ? []
            : [{
                id: invite.id,
                email: invite.email,
                role: invite.role,
                expiresAt: invite.expiresAt.toISOString(),
              }],
        )}
      />
    </main>
  );
}
