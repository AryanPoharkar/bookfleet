import type { PrismaClient } from "@/generated/prisma/client";
import type { BillingEvent } from "./types";
import type { PriceMap } from "./plan-mapping";
import { resolvePlanFromSubscription } from "./plan-mapping";

type Db = Pick<PrismaClient, "$transaction">;
const LIVE = ["active", "trialing", "past_due"];
const isLive = (status: string | null): boolean => status !== null && LIVE.includes(status);

export async function applyBillingEvent({ db, event, priceMap }: { db: Db; event: BillingEvent; priceMap: PriceMap }): Promise<"applied" | "duplicate" | "ignored"> {
  return db.$transaction(async (tx) => {
    const inserted = await tx.stripeEvent.createMany({ data: [{ stripeEventId: event.eventId, type: event.stripeType, payload: { eventId: event.eventId, kind: event.kind, provider: event.provider ?? "stripe" } }], skipDuplicates: true });
    if (inserted.count === 0) return "duplicate";

    if (event.provider === "razorpay") {
      const subscription = event.kind === "payment_failed" ? null : event.subscription;
      if (!subscription) return "ignored";
      if (subscription.businessId) {
        const owner = await tx.business.findFirst({ where: { razorpaySubscriptionId: subscription.id }, select: { id: true } });
        if (owner && owner.id !== subscription.businessId) { console.warn("[razorpay] ignored subscription owner mismatch", event.eventId); return "ignored"; }
      }
      const business = event.kind === "checkout_completed"
        ? await tx.business.findUnique({ where: { id: event.businessId }, select: { id: true, plan: true, billingProvider: true, razorpaySubscriptionId: true, subscriptionStatus: true } })
        : await tx.business.findFirst({ where: subscription.businessId ? { id: subscription.businessId } : { razorpaySubscriptionId: subscription.id }, select: { id: true, plan: true, billingProvider: true, razorpaySubscriptionId: true, subscriptionStatus: true } });
      if (!business) { console.warn("[razorpay] ignored missing business", event.eventId); return "ignored"; }
      const live = isLive(business.subscriptionStatus);
      if (event.kind === "checkout_completed") {
        if ((live && business.razorpaySubscriptionId && business.razorpaySubscriptionId !== subscription.id) || (business.billingProvider === "STRIPE" && live)) return "ignored";
        const resolved = resolvePlanFromSubscription({ status: subscription.status, priceId: subscription.priceId }, priceMap);
        await tx.business.update({ where: { id: business.id }, data: { ...(resolved.plan ? { plan: resolved.plan } : {}), razorpaySubscriptionId: subscription.id, ...(subscription.customerId ? { razorpayCustomerId: subscription.customerId } : {}), subscriptionStatus: resolved.status, billingProvider: "RAZORPAY" } });
        if (resolved.plan) { // CACHE-INVALIDATE-PLACEHOLDER (chunk 12)
        }
        return "applied";
      }
      if (business.razorpaySubscriptionId && business.razorpaySubscriptionId !== subscription.id) return "ignored";
      if (business.billingProvider === "STRIPE" && live) return "ignored";
      if (business.razorpaySubscriptionId === subscription.id && business.subscriptionStatus === "canceled" && event.kind === "subscription_changed") return "ignored";
      if (event.kind === "subscription_deleted") {
        await tx.business.update({ where: { id: business.id }, data: { plan: "FREE", subscriptionStatus: "canceled", razorpaySubscriptionId: subscription.id, billingProvider: "RAZORPAY" } });
        // CACHE-INVALIDATE-PLACEHOLDER (chunk 12)
        return "applied";
      }
      const resolved = resolvePlanFromSubscription({ status: subscription.status, priceId: subscription.priceId }, priceMap);
      await tx.business.update({ where: { id: business.id }, data: { ...(resolved.plan ? { plan: resolved.plan } : {}), subscriptionStatus: resolved.status, razorpaySubscriptionId: subscription.id, ...(subscription.customerId ? { razorpayCustomerId: subscription.customerId } : {}), billingProvider: "RAZORPAY" } });
      if (resolved.plan) { // CACHE-INVALIDATE-PLACEHOLDER (chunk 12)
      }
      return "applied";
    }

    if (event.kind === "payment_failed") {
      const business = await tx.business.findFirst({ where: { stripeCustomerId: event.customerId, stripeSubscriptionId: { not: null } }, select: { id: true, billingProvider: true, subscriptionStatus: true } });
      if (!business) return "ignored";
      if (business.billingProvider === "RAZORPAY" && isLive(business.subscriptionStatus)) { console.warn("[stripe] ignored event for Razorpay business", event.eventId); return "ignored"; }
      await tx.business.update({ where: { id: business.id }, data: { subscriptionStatus: "past_due", billingProvider: "STRIPE" } });
      // EMAIL-PLACEHOLDER (chunk 13)
      return "applied";
    }

    const subscription = event.subscription;
    const business = event.kind === "checkout_completed"
      ? await tx.business.findUnique({ where: { id: event.businessId }, select: { id: true, stripeSubscriptionId: true, billingProvider: true, subscriptionStatus: true } })
      : await tx.business.findFirst({ where: subscription.businessId ? { id: subscription.businessId } : { stripeSubscriptionId: subscription.id }, select: { id: true, stripeSubscriptionId: true, billingProvider: true, subscriptionStatus: true } });
    if (!business) return "ignored";
    if (event.kind !== "checkout_completed" && business.stripeSubscriptionId && business.stripeSubscriptionId !== subscription.id) return "ignored";
    if (event.kind !== "checkout_completed" && business.billingProvider === "RAZORPAY" && isLive(business.subscriptionStatus)) { console.warn("[stripe] ignored event for Razorpay business", event.eventId); return "ignored"; }
    if (event.kind === "subscription_deleted") {
      await tx.business.update({ where: { id: business.id }, data: { plan: "FREE", subscriptionStatus: "canceled", billingProvider: "STRIPE" } });
      // CACHE-INVALIDATE-PLACEHOLDER (chunk 12)
      return "applied";
    }
    const resolved = resolvePlanFromSubscription({ status: subscription.status, priceId: subscription.priceId }, priceMap);
    await tx.business.update({ where: { id: business.id }, data: { ...(resolved.plan ? { plan: resolved.plan } : {}), ...(subscription.customerId ? { stripeCustomerId: subscription.customerId } : {}), stripeSubscriptionId: subscription.id, subscriptionStatus: resolved.status, billingProvider: "STRIPE" } });
    if (resolved.plan) { // CACHE-INVALIDATE-PLACEHOLDER (chunk 12)
    }
    return "applied";
  }, { maxWait: 10000, timeout: 15000 });
}
