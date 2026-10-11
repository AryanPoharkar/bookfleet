import { getPriceMap } from "./plan-mapping";
import { isMockBillingEnabled } from "./mock/guard";

export type BillingMode = "mock" | "stripe" | "unavailable";

export function getBillingMode(
  env: Record<string, string | undefined> = process.env,
): BillingMode {
  if (isMockBillingEnabled(env)) return "mock";
  if (!env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) return "unavailable";
  try {
    getPriceMap(env);
    return "stripe";
  } catch {
    return "unavailable";
  }
}
