import { db } from "@/server/db";
import { getStripe } from "./client";
import { getPriceMapFromProcess } from "./plan-mapping";
import { verifyWebhook } from "./verify-webhook";
import { toBillingEvent } from "./to-billing-event";
import { applyBillingEvent } from "./apply-billing-event";
import type { SubscriptionSnapshot } from "./types";
export async function handleStripeWebhook(request: Request): Promise<Response> {
 const body = await request.text();
 const secret = process.env.STRIPE_WEBHOOK_SECRET;
 if (!secret) return Response.json({ error: "NOT_CONFIGURED" }, { status: 500 });
 let event;
 try { event = verifyWebhook({ stripe: getStripe(), body, signature: request.headers.get("stripe-signature"), secret }); } catch { return Response.json({ error: "NOT_CONFIGURED" }, { status: 500 }); }
 if (!event) return Response.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
 try {
  const stripe = getStripe();
  const fetchSubscription = async (id: string): Promise<SubscriptionSnapshot> => {
   const sub = await stripe.subscriptions.retrieve(id);
   const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
   return { id: sub.id, customerId, status: sub.status, priceId: sub.items.data[0]?.price.id ?? null, businessId: sub.metadata.businessId ?? null };
  };
  const billingEvent = await toBillingEvent(event, fetchSubscription);
  if (!billingEvent) return Response.json({ received: true });
  const result = await applyBillingEvent({ db, event: billingEvent, priceMap: getPriceMapFromProcess() });
  return Response.json({ received: true, result });
 } catch {
  console.error("[stripe] webhook failed", event.id, event.type);
  return Response.json({ error: "WEBHOOK_FAILED" }, { status: 500 });
 }
}
