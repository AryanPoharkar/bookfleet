import { notFound } from "next/navigation";
import type { MembershipRole } from "@/generated/prisma/client";
import { can, type Permission } from "@/server/rbac/permissions";

type TenantLike = { role: MembershipRole; staffId: string | null; db: { staff: { findFirst: (args: { where: { id: string } }) => Promise<{ id: string; name: string } | null> } } };
const accessMap: { schedule: { all: Permission; own: Permission }; timeoff: { all: Permission; own: Permission } } = { schedule: { all: "schedule:manage_all", own: "schedule:manage_own" }, timeoff: { all: "timeoff:manage_all", own: "timeoff:manage_own" } };

export async function assertScheduleAccess(tenant: TenantLike, staffId: string, kind: "schedule" | "timeoff") {
  const staff = await tenant.db.staff.findFirst({ where: { id: staffId } });
  if (!staff) notFound();
  const access = accessMap[kind];
  if (can(tenant.role, access.all) || (tenant.staffId === staffId && can(tenant.role, access.own))) return staff;
  notFound();
}
