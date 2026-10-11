import type { PrismaClient } from "@/generated/prisma/client";
import type { BillingEvent } from "./types";
import type { PriceMap } from "./plan-mapping";
import { resolvePlanFromSubscription } from "./plan-mapping";

type Db = Pick<PrismaClient, "$transaction">;

export async function applyBillingEvent({
  db,
  event,
  priceMap,
}: {
  db: Db;
  event: BillingEvent;
  priceMap: PriceMap;
}): Promise<"applied" | "duplicate" | "ignored"> {
  return db.$transaction(
    async (tx) => {
      const inserted = await tx.stripeEvent.createMany({
        data: [
          {
            stripeEventId: event.eventId,
            type: event.stripeType,
            payload: { eventId: event.eventId, kind: event.kind },
          },
        ],
        skipDuplicates: true,
      });
      if (inserted.count === 0) return "duplicate";

      if (event.kind === "payment_failed") {
        const business = await tx.business.findFirst({
          where: {
            stripeCustomerId: event.customerId,
            stripeSubscriptionId: { not: null },
          },
          select: { id: true },
        });
        if (!business) {
          console.warn("[stripe] ignored payment_failed", event.eventId);
          return "ignored";
        }
        await tx.business.update({
          where: { id: business.id },
          data: { subscriptionStatus: "past_due" },
        });
        // EMAIL-PLACEHOLDER (chunk 13)
        return "applied";
      }

      const subscription = event.subscription;
      const business = event.kind === "checkout_completed"
        ? await tx.business.findUnique({
            where: { id: event.businessId },
            select: { id: true, stripeSubscriptionId: true },
          })
        : await tx.business.findFirst({
            where: subscription.businessId
              ? { id: subscription.businessId }
              : { stripeSubscriptionId: subscription.id },
            select: { id: true, stripeSubscriptionId: true },
          });

      if (!business) {
        console.warn("[stripe] ignored missing business", event.eventId);
        return "ignored";
      }
      if (
        event.kind !== "checkout_completed" &&
        business.stripeSubscriptionId &&
        business.stripeSubscriptionId !== subscription.id
      ) {
        console.warn("[stripe] ignored mismatched subscription", event.eventId, business.id);
        return "ignored";
      }

      if (event.kind === "subscription_deleted") {
        await tx.business.update({
          where: { id: business.id },
          data: { plan: "FREE", subscriptionStatus: "canceled" },
        });
        // CACHE-INVALIDATE-PLACEHOLDER (chunk 12)
        return "applied";
      }

      const resolved = resolvePlanFromSubscription(
        { status: subscription.status, priceId: subscription.priceId },
        priceMap,
      );
      await tx.business.update({
        where: { id: business.id },
        data: {
          ...(resolved.plan ? { plan: resolved.plan } : {}),
          stripeCustomerId: subscription.customerId,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: resolved.status,
        },
      });
      if (resolved.plan) {
        // CACHE-INVALIDATE-PLACEHOLDER (chunk 12)
      }
      return "applied";
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
