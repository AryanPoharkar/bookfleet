import { notFound } from "next/navigation";
import type { MembershipRole } from "@/generated/prisma/client";
import { can, type Permission } from "@/server/rbac/permissions";

export function requirePermission(tenant: { role: MembershipRole }, permission: Permission) {
  if (!can(tenant.role, permission)) notFound();
}
