import { z } from "zod";
import { isReservedSlug } from "@/server/tenancy/reserved-slugs";

const currencies = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"] as const;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: slugSchema.refine((value) => !isReservedSlug(value), "This slug is reserved."),
  timezone: z
    .string()
    .refine(
      (value) => Intl.supportedValuesOf("timeZone").includes(value),
      "Choose a valid timezone.",
    ),
  currency: z.enum(currencies).default("USD"),
});
