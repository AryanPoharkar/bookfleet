import type { Plan } from "@/config/plans";
export type PriceMap = { PRO: string; BUSINESS: string };
export function getPriceMap(env: Record<string, string | undefined>): PriceMap {
 if (!env.STRIPE_PRICE_PRO?.startsWith("price_")) throw new Error("Missing or invalid STRIPE_PRICE_PRO");
 if (!env.STRIPE_PRICE_BUSINESS?.startsWith("price_")) throw new Error("Missing or invalid STRIPE_PRICE_BUSINESS");
 return { PRO: env.STRIPE_PRICE_PRO, BUSINESS: env.STRIPE_PRICE_BUSINESS };
}
export function getPriceMapFromProcess(): PriceMap { return getPriceMap(process.env); }
export function planFromPriceId(priceId: string | null, map: PriceMap): Plan | null {
 if (priceId === map.PRO) return "PRO";
 if (priceId === map.BUSINESS) return "BUSINESS";
 return null;
}
export function priceIdForPlan(map: PriceMap, plan: "PRO" | "BUSINESS"): string { return map[plan]; }
export function resolvePlanFromSubscription(input: { status: string; priceId: string | null }, map: PriceMap): { plan: Plan | null; status: string } {
 if (["unpaid", "canceled", "incomplete_expired", "paused"].includes(input.status)) return { plan: "FREE", status: input.status };
 if (input.status === "active" || input.status === "trialing" || input.status === "past_due") return { plan: planFromPriceId(input.priceId, map), status: input.status };
 return { plan: null, status: input.status };
}
