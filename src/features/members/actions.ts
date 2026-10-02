"use server";

import { requireUser } from "@/server/auth/session";
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { createInvite, acceptInvite } from "@/server/tenancy/invites";
import { changeMemberRole, removeMember } from "@/server/tenancy/members";
import {
  inviteMemberSchema,
  memberRoleSchema,
  removeMemberSchema,
  acceptInviteSchema,
} from "@/features/members/schemas";

export async function inviteMemberAction(slug: string, formData: FormData) {
  const tenant = await requireTenant(slug);
  requirePermission(tenant, "members:manage");
  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "Invalid invite details." };

  const token = await createInvite(
    tenant.business.id,
    parsed.data.email,
    parsed.data.role,
  );
  return { token };
}

export async function changeRoleAction(slug: string, formData: FormData) {
  const tenant = await requireTenant(slug);
  requirePermission(tenant, "members:manage");
  const parsed = memberRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "Invalid role." };

  const result = await changeMemberRole(
    tenant.business.id,
    parsed.data.userId,
    parsed.data.role,
  );
  return "error" in result ? { error: result.error } : { ok: true };
}

export async function removeMemberAction(slug: string, formData: FormData) {
  const tenant = await requireTenant(slug);
  requirePermission(tenant, "members:manage");
  const parsed = removeMemberSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { error: "Invalid member." };

  const result = await removeMember(tenant.business.id, parsed.data.userId);
  return "error" in result ? { error: result.error } : { ok: true };
}

// RATE-LIMIT-PLACEHOLDER (chunk 12)
export async function acceptInviteAction(formData: FormData) {
  const parsed = acceptInviteSchema.safeParse({ token: formData.get("token") });
  if (!parsed.success) return { error: "INVALID" as const };

  const user = await requireUser();
  const result = await acceptInvite(user.id, parsed.data.token);
  if (result.status !== "OK") return { error: result.status };
  return { slug: result.slug };
}
