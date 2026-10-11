import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_test_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_PRICE_PRO: z.string().startsWith("price_"),
  STRIPE_PRICE_BUSINESS: z.string().startsWith("price_"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const invalidVariables = [
    ...new Set(
      result.error.issues
        .map((issue) => issue.path[0])
        .filter((name): name is string => typeof name === "string"),
    ),
  ];

  throw new Error(
    `Environment validation failed. Check these variables: ${invalidVariables.join(", ")}`,
  );
}

export const env = result.data;
