import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { db } from "../src/server/db";
import { applyBillingEvent } from "../src/server/stripe/apply-billing-event";
import { getPriceMap } from "../src/server/stripe/plan-mapping";
import type { BillingEvent } from "../src/server/stripe/types";

const suffix = randomBytes(8).toString("hex");
const slug = `vitest-billing-${suffix}`;
const eventPrefix = `evt_chunk11_db_${suffix}_`;
const priceMap = getPriceMap({
  STRIPE_PRICE_PRO: "price_test_pro",
  STRIPE_PRICE_BUSINESS: "price_test_business",
});

let businessId: string;

async function clearEvents() {
  await db.stripeEvent.deleteMany({ where: { stripeEventId: { startsWith: eventPrefix } } });
}

beforeAll(async () => {
  const business = await db.business.create({
    data: { name: slug, slug, timezone: "UTC", plan: "FREE" },
    select: { id: true },
  });
  businessId = business.id;
});

beforeEach(async () => {
  await clearEvents();
  await db.business.update({
    where: { id: businessId },
    data: {
      plan: "FREE",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
    },
  });
});

afterAll(async () => {
  await clearEvents();
  if (businessId) await db.business.deleteMany({ where: { id: businessId } });
});

function checkoutEvent(eventId: string): BillingEvent {
  return {
    eventId,
    stripeType: "checkout.session.completed",
    kind: "checkout_completed",
    businessId,
    customerId: "cus_chunk11_test",
    subscription: {
      id: "sub_chunk11_test",
      customerId: "cus_chunk11_test",
      status: "active",
      priceId: "price_test_pro",
      businessId,
    },
  };
}

describe("billing database events", () => {
  it("applies a completed checkout to the matching business", async () => {
    const eventId = `${eventPrefix}checkout`;
    await expect(applyBillingEvent({ db, event: checkoutEvent(eventId), priceMap })).resolves.toBe("applied");

    await expect(db.business.findUnique({
      where: { id: businessId },
      select: { plan: true, stripeCustomerId: true, stripeSubscriptionId: true, subscriptionStatus: true },
    })).resolves.toEqual({
      plan: "PRO",
      stripeCustomerId: "cus_chunk11_test",
      stripeSubscriptionId: "sub_chunk11_test",
      subscriptionStatus: "active",
    });
    await expect(db.stripeEvent.findUnique({ where: { stripeEventId: eventId } })).resolves.toMatchObject({
      stripeEventId: eventId,
      type: "checkout.session.completed",
    });
  });

  it("deduplicates a Stripe event and does not apply it twice", async () => {
    const event = checkoutEvent(`${eventPrefix}duplicate`);
    await expect(applyBillingEvent({ db, event, priceMap })).resolves.toBe("applied");
    await db.business.update({ where: { id: businessId }, data: { plan: "FREE" } });

    await expect(applyBillingEvent({ db, event, priceMap })).resolves.toBe("duplicate");
    await expect(db.business.findUnique({ where: { id: businessId }, select: { plan: true } })).resolves.toEqual({ plan: "FREE" });
    await expect(db.stripeEvent.count({ where: { stripeEventId: event.eventId } })).resolves.toBe(1);
  });

  it("downgrades a deleted subscription to FREE without deleting its identifiers", async () => {
    await db.business.update({
      where: { id: businessId },
      data: { plan: "BUSINESS", stripeCustomerId: "cus_chunk11_test", stripeSubscriptionId: "sub_chunk11_test", subscriptionStatus: "active" },
    });
    const event: BillingEvent = {
      eventId: `${eventPrefix}deleted`,
      stripeType: "customer.subscription.deleted",
      kind: "subscription_deleted",
      subscription: {
        id: "sub_chunk11_test",
        customerId: "cus_chunk11_test",
        status: "canceled",
        priceId: "price_test_business",
        businessId,
      },
    };

    await expect(applyBillingEvent({ db, event, priceMap })).resolves.toBe("applied");
    await expect(db.business.findUnique({
      where: { id: businessId },
      select: { plan: true, stripeCustomerId: true, stripeSubscriptionId: true, subscriptionStatus: true },
    })).resolves.toEqual({
      plan: "FREE",
      stripeCustomerId: "cus_chunk11_test",
      stripeSubscriptionId: "sub_chunk11_test",
      subscriptionStatus: "canceled",
    });
  });

  it("marks a failed payment past_due without changing the plan", async () => {
    await db.business.update({
      where: { id: businessId },
      data: { plan: "PRO", stripeCustomerId: "cus_chunk11_test", stripeSubscriptionId: "sub_chunk11_test", subscriptionStatus: "active" },
    });
    const event: BillingEvent = {
      eventId: `${eventPrefix}payment-failed`,
      stripeType: "invoice.payment_failed",
      kind: "payment_failed",
      customerId: "cus_chunk11_test",
    };

    await expect(applyBillingEvent({ db, event, priceMap })).resolves.toBe("applied");
    await expect(db.business.findUnique({
      where: { id: businessId },
      select: { plan: true, subscriptionStatus: true },
    })).resolves.toEqual({ plan: "PRO", subscriptionStatus: "past_due" });
  });

  it("records an event for a missing business as ignored", async () => {
    const event: BillingEvent = {
      eventId: `${eventPrefix}missing`,
      stripeType: "checkout.session.completed",
      kind: "checkout_completed",
      businessId: `missing-${suffix}`,
      customerId: "cus_missing",
      subscription: {
        id: "sub_missing",
        customerId: "cus_missing",
        status: "active",
        priceId: "price_test_pro",
        businessId: `missing-${suffix}`,
      },
    };

    await expect(applyBillingEvent({ db, event, priceMap })).resolves.toBe("ignored");
    await expect(db.stripeEvent.count({ where: { stripeEventId: event.eventId } })).resolves.toBe(1);
    await expect(db.business.findUnique({ where: { id: businessId }, select: { plan: true } })).resolves.toEqual({ plan: "FREE" });
  });
});
