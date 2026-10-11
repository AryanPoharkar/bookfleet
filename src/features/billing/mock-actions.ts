"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { PrismaClient } from "@/generated/prisma/client";
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { runMockBillingAction } from "@/server/stripe/mock/run-mock-action";
import { mockBillingMessage } from "./mock-messages";

export async function runMockAction(slug: string, input: unknown) {
  const tenant = await requireTenant(slug);
  try {
    requirePermission(tenant, "billing:manage");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    notFound();
  }

  const result = await runMockBillingAction({ db: tenant.db as unknown as PrismaClient, businessId: tenant.business.id, input });
  if (!result.ok) return { error: result.error, message: mockBillingMessage(result.error) };

  revalidatePath(`/app/${slug}/billing`);
  revalidatePath(`/app/${slug}`);
  return { success: true };
}
