import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(), DIRECT_URL: z.url(),
  AUTH_SECRET: z.string().min(32), AUTH_GOOGLE_ID: z.string().min(1), AUTH_GOOGLE_SECRET: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_test_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  STRIPE_PRICE_PRO: z.string().startsWith("price_").optional(),
  STRIPE_PRICE_BUSINESS: z.string().startsWith("price_").optional(),
  RAZORPAY_KEY_ID: z.string().startsWith("rzp_test_").optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
  RAZORPAY_PLAN_PRO: z.string().startsWith("plan_").optional(),
  RAZORPAY_PLAN_BUSINESS: z.string().startsWith("plan_").optional(),
  BILLING_PROVIDER: z.enum(["stripe", "razorpay"]).optional(),
  BILLING_MOCK: z.enum(["true", "false"]).optional(),
}).superRefine((v, ctx) => {
  const stripe = [v.STRIPE_SECRET_KEY, v.STRIPE_WEBHOOK_SECRET, v.STRIPE_PRICE_PRO, v.STRIPE_PRICE_BUSINESS];
  if (stripe.some(Boolean) && !stripe.every(Boolean)) ctx.addIssue({ code: "custom", message: "Stripe variables must be configured together", path: ["STRIPE_SECRET_KEY"] });
  const razorpay = [v.RAZORPAY_KEY_ID, v.RAZORPAY_KEY_SECRET, v.RAZORPAY_WEBHOOK_SECRET, v.RAZORPAY_PLAN_PRO, v.RAZORPAY_PLAN_BUSINESS];
  if (razorpay.some(Boolean) && !razorpay.every(Boolean)) ctx.addIssue({ code: "custom", message: "Razorpay variables must be configured together", path: ["RAZORPAY_KEY_ID"] });
}).refine((value) => !(value.BILLING_MOCK === "true" && process.env.NODE_ENV === "production"), { message: "BILLING_MOCK=true is only allowed in development.", path: ["BILLING_MOCK"] });

const result = envSchema.safeParse(process.env);
if (!result.success) {
  const invalidVariables = [...new Set(result.error.issues.map((issue) => issue.path[0]).filter((name): name is string => typeof name === "string"))];
  throw new Error(`Environment validation failed. Check these variables: ${invalidVariables.join(", ")}`);
}
export const env = result.data;
