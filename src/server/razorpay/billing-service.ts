import type { TenantDb } from "@/server/tenancy/types";
import type { PriceMap } from "@/server/stripe/plan-mapping";
import type { RazorpayClient } from "./client";
import { RAZORPAY_TOTAL_COUNT } from "./config";

type Plan = "PRO" | "BUSINESS";
type Result<T> = { ok: true; value: T } | { ok: false; error: "ALREADY_SUBSCRIBED" | "NO_SUBSCRIPTION" | "PROVIDER_ERROR" | "PAYMENT_NOT_VERIFIED" };
const live = (status: string | null): boolean => ["active", "trialing", "past_due"].includes(status ?? "");
export async function startRazorpayCheckout(input: { db: TenantDb; businessId: string; user: { name?: string | null; email?: string | null }; plan: Plan; client: RazorpayClient; planMap: PriceMap; keyId: string }): Promise<Result<{ checkout: { keyId: string; subscriptionId: string; name: string; description: string; prefill: { name: string; email: string } } }>> {
  const business = await input.db.business.findFirst({ where: {}, select: { subscriptionStatus: true } });
  if (business && live(business.subscriptionStatus)) return { ok: false, error: "ALREADY_SUBSCRIBED" };
  try { const subscription = await input.client.createSubscription({ planId: input.planMap[input.plan], totalCount: RAZORPAY_TOTAL_COUNT, notes: { businessId: input.businessId } }); return { ok: true, value: { checkout: { keyId: input.keyId, subscriptionId: subscription.id, name: "Bookfleet", description: `${input.plan === "PRO" ? "Pro" : "Business"} plan`, prefill: { name: input.user.name ?? "", email: input.user.email ?? "" } } } }; }
  catch (error) { const status = error && typeof error === "object" && "httpStatus" in error ? error.httpStatus : "unknown"; const code = error && typeof error === "object" && "razorpayCode" in error ? error.razorpayCode : "unknown"; console.error("[razorpay] subscription create failed", { status, code }); return { ok: false, error: "PROVIDER_ERROR" }; }
}
export async function verifyRazorpayPayment(input: { businessId: string; input: { paymentId: string; subscriptionId: string; signature: string }; client: RazorpayClient; planMap: PriceMap; secret: string; verifySignature: (args: { paymentId: string; subscriptionId: string; signature: string; secret: string }) => boolean }): Promise<Result<{ verified: true }>> {
  try { const subscription = await input.client.fetchSubscription(input.input.subscriptionId); if (subscription.notes.businessId !== input.businessId || !Object.values(input.planMap).includes(subscription.planId) || subscription.id !== input.input.subscriptionId) return { ok: false, error: "PAYMENT_NOT_VERIFIED" }; if (!input.verifySignature({ paymentId: input.input.paymentId, subscriptionId: subscription.id, signature: input.input.signature, secret: input.secret })) return { ok: false, error: "PAYMENT_NOT_VERIFIED" }; return { ok: true, value: { verified: true } }; } catch { return { ok: false, error: "PAYMENT_NOT_VERIFIED" }; }
}
export async function cancelRazorpaySubscription(input: { db: TenantDb; when: "now" | "cycle_end"; client: RazorpayClient }): Promise<Result<{ cancelAtCycleEnd: boolean }>> {
  const business = await input.db.business.findFirst({ where: {}, select: { razorpaySubscriptionId: true, subscriptionStatus: true } });
  if (!business?.razorpaySubscriptionId || !live(business.subscriptionStatus)) return { ok: false, error: "NO_SUBSCRIPTION" };
  try { await input.client.cancelSubscription(business.razorpaySubscriptionId, input.when === "cycle_end"); return { ok: true, value: { cancelAtCycleEnd: input.when === "cycle_end" } }; } catch (error) { const status = error && typeof error === "object" && "httpStatus" in error ? error.httpStatus : "unknown"; const code = error && typeof error === "object" && "razorpayCode" in error ? error.razorpayCode : "unknown"; console.error("[razorpay] cancellation request failed", { status, code }); return { ok: false, error: "PROVIDER_ERROR" }; }
}
