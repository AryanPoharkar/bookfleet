import { describe, expect, it } from "vitest";
import { can, PERMISSIONS } from "@/server/rbac/permissions";

describe("permissions", () => {
  it("matches the role permission matrix", () => {
    const expected = { OWNER: new Set(PERMISSIONS), MANAGER: new Set(PERMISSIONS.slice(0, 11)), STAFF: new Set(["booking:view_own", "booking:cancel_own", "schedule:manage_own", "timeoff:manage_own"]) };
    for (const role of ["OWNER", "MANAGER", "STAFF"] as const) {
      for (const permission of PERMISSIONS) expect(can(role, permission)).toBe(expected[role].has(permission));
    }
  });
});
