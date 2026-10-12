import { z } from "zod";
import type { BillingEvent } from "../stripe/types";
import { mapRazorpayStatus } from "./status";
const entitySchema = z.object({ id: z.string().min(1), plan_id: z.string().min(1), status: z.string(), customer_id: z.string().nullable().optional(), notes: z.union([z.record(z.string(), z.string()), z.array(z.unknown())]).optional() });
const payloadSchema = z.object({ event: z.string(), payload: z.object({ subscription: z.object({ entity: entitySchema }).optional() }) });
export function toRazorpayBillingEvent(input: { body: unknown; eventId: string }): BillingEvent | null {
  const parsed = payloadSchema.safeParse(input.body); if (!parsed.success) return null;
  const name = parsed.data.event; const entity = parsed.data.payload.subscription?.entity; if (!entity) return null;
  const notes = entity.notes && !Array.isArray(entity.notes) ? entity.notes : {};
  const businessId = typeof notes.businessId === "string" && notes.businessId.length > 0 ? notes.businessId : null;
  const subscription = { id: entity.id, customerId: entity.customer_id ?? null, status: mapRazorpayStatus(entity.status), priceId: entity.plan_id, businessId };
  const base = { eventId: input.eventId, provider: "razorpay" as const, stripeType: name };
  if (name === "subscription.activated") return businessId ? { ...base, kind: "checkout_completed", stripeType: "checkout.session.completed", businessId, customerId: entity.customer_id ?? null, subscription } : { ...base, kind: "subscription_changed", stripeType: "customer.subscription.updated", subscription };
  if (["subscription.charged", "subscription.pending", "subscription.halted", "subscription.paused", "subscription.resumed", "subscription.updated"].includes(name)) return { ...base, kind: "subscription_changed", stripeType: "customer.subscription.updated", subscription };
  if (["subscription.cancelled", "subscription.completed"].includes(name)) return { ...base, kind: "subscription_deleted", stripeType: "customer.subscription.deleted", subscription: { ...subscription, status: "canceled" } };
  return null;
}
