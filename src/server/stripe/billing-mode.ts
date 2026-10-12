import { getPriceMap } from "./plan-mapping";
import { isMockBillingEnabled } from "./mock/guard";
import { isRazorpayConfigured } from "../razorpay/config";
export type BillingMode = "mock" | "stripe" | "razorpay" | "unavailable";
function stripeConfigured(env: Record<string, string | undefined>): boolean { if (!env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) return false; try { getPriceMap(env); return true; } catch { return false; } }
export function getBillingMode(env: Record<string, string | undefined> = process.env): BillingMode {
  if (isMockBillingEnabled(env)) return "mock";
  const stripeOk = stripeConfigured(env); const razorpayOk = isRazorpayConfigured(env);
  if (env.BILLING_PROVIDER === "stripe") return stripeOk ? "stripe" : "unavailable";
  if (env.BILLING_PROVIDER === "razorpay") return razorpayOk ? "razorpay" : "unavailable";
  if (env.BILLING_PROVIDER !== undefined) return "unavailable";
  return stripeOk ? "stripe" : razorpayOk ? "razorpay" : "unavailable";
}
