// CACHE-INVALIDATE-PLACEHOLDER (chunk 12)
"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { settingsSchema } from "@/features/bookings-admin/schemas";

export async function saveSettingsAction(slug: string, input: unknown) {
  const tenant = await requireTenant(slug);
  requirePermission(tenant, "settings:manage");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT", message: "Please check the details and try again." };
  const updated = await tenant.db.business.updateMany({ where: { id: tenant.business.id }, data: parsed.data });
  if (updated.count !== 1) return { error: "UNKNOWN", message: "Something went wrong on our side. Please try again." };
  revalidatePath(`/app/${slug}`);
  revalidatePath(`/book/${slug}`);
  return { success: true as const };
}
