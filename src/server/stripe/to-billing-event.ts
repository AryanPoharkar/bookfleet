import type Stripe from "stripe";
import type { BillingEvent, SubscriptionSnapshot } from "./types";
function idOf(value: string | { id: string } | null | undefined): string | null {
 if (typeof value === "string") return value;
 if (value && typeof value.id === "string") return value.id;
 return null;
}
export async function toBillingEvent(event: Stripe.Event, fetchSubscription: (id: string) => Promise<SubscriptionSnapshot>): Promise<BillingEvent | null> {
 const obj = event.data.object;
 if (event.type === "checkout.session.completed") {
  if (!("mode" in obj) || obj.mode !== "subscription") return null;
  const businessId = obj.metadata?.businessId ?? obj.client_reference_id;
  const customerId = idOf(obj.customer);
  const subscriptionId = idOf(obj.subscription);
  if (!businessId || !customerId || !subscriptionId) return null;
  return { kind: "checkout_completed", eventId: event.id, stripeType: "checkout.session.completed", businessId, customerId, subscription: await fetchSubscription(subscriptionId) };
 }
 if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
  if (!("items" in obj) || !("customer" in obj)) return null;
  const snapshot: SubscriptionSnapshot = { id: obj.id, customerId: idOf(obj.customer) ?? "", status: obj.status, priceId: obj.items.data[0]?.price.id ?? null, businessId: obj.metadata.businessId ?? null };
  if (!snapshot.customerId) return null;
  return event.type === "customer.subscription.updated"
   ? { kind: "subscription_changed", eventId: event.id, stripeType: "customer.subscription.updated", subscription: snapshot }
   : { kind: "subscription_deleted", eventId: event.id, stripeType: "customer.subscription.deleted", subscription: snapshot };
 }
 if (event.type === "invoice.payment_failed") {
  if (!("customer" in obj)) return null;
  const customerId = idOf(obj.customer);
  return customerId ? { kind: "payment_failed", eventId: event.id, stripeType: "invoice.payment_failed", customerId } : null;
 }
 return null;
}
