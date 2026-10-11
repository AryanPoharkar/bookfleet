"use server";
import { redirect } from "next/navigation";
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { getStripe } from "@/server/stripe/client";
import { getPriceMapFromProcess, priceIdForPlan } from "@/server/stripe/plan-mapping";
import { startCheckoutInputSchema } from "./schemas";
import { billingMessage } from "./messages";
import { getAppUrl } from "@/server/app-url";
export async function startCheckoutAction(slug: string, input: unknown) {
 const tenant = await requireTenant(slug); requirePermission(tenant, "billing:manage");
 const parsed = startCheckoutInputSchema.safeParse(input);
 if (!parsed.success) return { error: "INVALID_INPUT", message: billingMessage("INVALID_INPUT") };
 const business = await tenant.db.business.findFirst({ where: {}, select: { plan: true, stripeCustomerId: true, subscriptionStatus: true } });
 if (!business) return { error: "UNKNOWN", message: billingMessage("UNKNOWN") };
 if (["active", "trialing", "past_due"].includes(business.subscriptionStatus ?? "")) return { error: "ALREADY_SUBSCRIBED", message: billingMessage("ALREADY_SUBSCRIBED") };
 if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_PRO || !process.env.STRIPE_PRICE_BUSINESS) return { error: "NOT_CONFIGURED", message: billingMessage("NOT_CONFIGURED") };
 let url: string | null = null;
 try {
  const stripe = getStripe(); const priceMap = getPriceMapFromProcess(); const page = `${getAppUrl()}/app/${slug}/billing`;
  const session = await stripe.checkout.sessions.create({ mode: "subscription", line_items: [{ price: priceIdForPlan(priceMap, parsed.data.plan), quantity: 1 }], client_reference_id: tenant.business.id, metadata: { businessId: tenant.business.id }, subscription_data: { metadata: { businessId: tenant.business.id } }, ...(business.stripeCustomerId ? { customer: business.stripeCustomerId } : tenant.user.email ? { customer_email: tenant.user.email } : {}), success_url: `${page}?checkout=success`, cancel_url: `${page}?checkout=cancelled` });
  url = session.url;
 } catch (error) { console.error("[billing] checkout failed", error instanceof Error ? error.message : "unknown"); return { error: "STRIPE_ERROR", message: billingMessage("STRIPE_ERROR") }; }
 if (!url) return { error: "STRIPE_ERROR", message: billingMessage("STRIPE_ERROR") };
 redirect(url);
}
export async function openPortalAction(slug: string) {
 const tenant = await requireTenant(slug); requirePermission(tenant, "billing:manage");
 const business = await tenant.db.business.findFirst({ where: {}, select: { stripeCustomerId: true } });
 if (!business?.stripeCustomerId) return { error: "NO_CUSTOMER", message: billingMessage("NO_CUSTOMER") };
 try { const session = await getStripe().billingPortal.sessions.create({ customer: business.stripeCustomerId, return_url: `${getAppUrl()}/app/${slug}/billing` }); redirect(session.url); }
 catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; console.error("[billing] portal failed", error instanceof Error ? error.message : "unknown"); return { error: "STRIPE_ERROR", message: billingMessage("STRIPE_ERROR") }; }
}
