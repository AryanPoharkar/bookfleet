"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { createBusiness, isSlugAvailable } from "@/server/tenancy/create-business";
import { isReservedSlug } from "@/server/tenancy/reserved-slugs";
import { onboardingSchema, slugSchema } from "@/features/onboarding/schemas";

export async function checkSlugAction(formData: FormData) {
  await requireUser();
  const value = String(formData.get("slug") ?? "").trim().toLowerCase();
  const parsed = slugSchema.safeParse(value);
  if (!parsed.success) return { status: "invalid" as const };
  if (isReservedSlug(value)) return { status: "reserved" as const };
  return {
    status: (await isSlugAvailable(value)) ? ("available" as const) : ("taken" as const),
  };
}

export async function createBusinessAction(
  _previousState: { error?: string },
  formData: FormData,
) {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    timezone: formData.get("timezone"),
    currency: formData.get("currency") ?? "USD",
  });
  if (!parsed.success) return { error: "Please check your business details." };

  const result = await createBusiness({ userId: user.id, ...parsed.data });
  if ("error" in result) return { error: "That slug is already taken." };
  redirect(`/app/${result.slug}`);
}
