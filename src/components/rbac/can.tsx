import type { ReactNode } from "react";
import type { MembershipRole } from "@/generated/prisma/client";
import { can, type Permission } from "@/server/rbac/permissions";

export function Can({ role, permission, fallback = null, children }: { role: MembershipRole; permission: Permission; fallback?: ReactNode; children: ReactNode }) {
  return can(role, permission) ? children : fallback;
}
