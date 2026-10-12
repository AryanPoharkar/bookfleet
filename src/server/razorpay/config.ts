import type { PriceMap } from "../stripe/plan-mapping";

export const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";
export const RAZORPAY_TOTAL_COUNT = 120;
export type RazorpayEnv = Record<string, string | undefined>;
export function getRazorpayConfig(env: RazorpayEnv = process.env): { keyId: string; keySecret: string } {
  if (!env.RAZORPAY_KEY_ID) throw new Error("Missing RAZORPAY_KEY_ID");
  if (!env.RAZORPAY_KEY_SECRET) throw new Error("Missing RAZORPAY_KEY_SECRET");
  if (!env.RAZORPAY_KEY_ID.startsWith("rzp_test_")) throw new Error("Bookfleet only runs Razorpay in test mode");
  return { keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET };
}
export function getRazorpayWebhookSecret(env: RazorpayEnv = process.env): string | null { return env.RAZORPAY_WEBHOOK_SECRET || null; }
export function getRazorpayPlanMap(env: RazorpayEnv = process.env): PriceMap {
  if (!env.RAZORPAY_PLAN_PRO) throw new Error("Missing RAZORPAY_PLAN_PRO");
  if (!env.RAZORPAY_PLAN_BUSINESS) throw new Error("Missing RAZORPAY_PLAN_BUSINESS");
  if (!env.RAZORPAY_PLAN_PRO.startsWith("plan_")) throw new Error("Invalid RAZORPAY_PLAN_PRO");
  if (!env.RAZORPAY_PLAN_BUSINESS.startsWith("plan_")) throw new Error("Invalid RAZORPAY_PLAN_BUSINESS");
  return { PRO: env.RAZORPAY_PLAN_PRO, BUSINESS: env.RAZORPAY_PLAN_BUSINESS };
}
export function isRazorpayConfigured(env: RazorpayEnv = process.env): boolean { try { getRazorpayConfig(env); getRazorpayPlanMap(env); return Boolean(getRazorpayWebhookSecret(env)); } catch { return false; } }
