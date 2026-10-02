import type { MembershipRole } from "@/generated/prisma/client";

export const PERMISSIONS = [
  "service:manage", "staff:manage", "booking:view_all", "booking:cancel_all", "booking:view_own", "booking:cancel_own", "schedule:manage_all", "schedule:manage_own", "timeoff:manage_all", "timeoff:manage_own", "settings:manage", "billing:manage", "members:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const rolePermissions: Record<MembershipRole, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  MANAGER: PERMISSIONS.slice(0, 11),
  STAFF: ["booking:view_own", "booking:cancel_own", "schedule:manage_own", "timeoff:manage_own"],
};

export function can(role: MembershipRole, permission: Permission) {
  return rolePermissions[role].includes(permission);
}
