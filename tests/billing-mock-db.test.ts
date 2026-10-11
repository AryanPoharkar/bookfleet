import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/server/db";
import { runMockBillingAction } from "../src/server/stripe/mock/run-mock-action";

const slugA = "vitest-mock-a";
const slugB = "vitest-mock-b";
const eventIds: string[] = [];
const ON = { BILLING_MOCK: "true", NODE_ENV: "development" };
let businessA = "";
let businessB = "";

async function removeBusinesses() {
  await db.business.deleteMany({ where: { slug: { in: [slugA, slugB] } } });
}

beforeAll(async () => {
  await removeBusinesses();
  const a = await db.business.create({ data: { name: slugA, slug: slugA, timezone: "America/Chicago", plan: "FREE" }, select: { id: true } });
  const b = await db.business.create({ data: { name: slugB, slug: slugB, timezone: "America/Chicago", plan: "FREE" }, select: { id: true } });
  businessA = a.id;
  businessB = b.id;
});

beforeEach(async () => {
  await db.business.updateMany({
    where: { id: { in: [businessA, businessB] } },
    data: { plan: "FREE", stripeCustomerId: null, stripeSubscriptionId: null, subscriptionStatus: null },
  });
  if (eventIds.length > 0) {
    await db.stripeEvent.deleteMany({ where: { stripeEventId: { in: eventIds } } });
    eventIds.length = 0;
  }
});

afterAll(async () => {
  if (eventIds.length > 0) await db.stripeEvent.deleteMany({ where: { stripeEventId: { in: eventIds } } });
  await removeBusinesses();
});

async function action(businessId: string, input: unknown, env: Record<string, string | undefined> = ON) {
  const result = await runMockBillingAction({ db, businessId, input, env });
  if (result.ok) eventIds.push(result.eventId);
  return result;
}

describe("mock billing database integration", () => {
  it("applies checkout, plan changes, payment states, cancellation, and re-checkout", async () => {
    const checkout = await action(businessA, { kind: "checkout", plan: "PRO" });
    expect(checkout.ok).toBe(true);
    if (!checkout.ok) return;
    const firstEventId = checkout.eventId;
    const first = await db.business.findUnique({ where: { id: businessA }, select: { plan: true, subscriptionStatus: true, stripeCustomerId: true, stripeSubscriptionId: true } });
    expect(first?.plan).toBe("PRO");
    expect(first?.subscriptionStatus).toBe("active");
    expect(first?.stripeCustomerId).toMatch(/^cus_mock_/);
    expect(first?.stripeSubscriptionId).toMatch(/^sub_mock_/);
    expect(await db.stripeEvent.findUnique({ where: { stripeEventId: firstEventId }, select: { type: true } })).toEqual({ type: "checkout.session.completed" });
    expect((await action(businessA, { kind: "checkout", plan: "PRO" }))).toMatchObject({ ok: false, error: "ALREADY_SUBSCRIBED" });

    expect((await action(businessA, { kind: "change_plan", plan: "BUSINESS" })).ok).toBe(true);
    const current = await db.business.findUnique({ where: { id: businessA }, select: { plan: true, stripeCustomerId: true, stripeSubscriptionId: true } });
    expect(current?.plan).toBe("BUSINESS");
    expect(current?.stripeCustomerId).toBe(first?.stripeCustomerId);
    expect(current?.stripeSubscriptionId).toBe(first?.stripeSubscriptionId);

    expect((await action(businessA, { kind: "payment_failed" })).ok).toBe(true);
    const afterFailure = await db.business.findUnique({ where: { id: businessA }, select: { plan: true, subscriptionStatus: true } });
    expect(afterFailure).toEqual({ plan: "BUSINESS", subscriptionStatus: "past_due" });
    expect((await action(businessA, { kind: "payment_recovered" })).ok).toBe(true);
    expect((await db.business.findUnique({ where: { id: businessA }, select: { subscriptionStatus: true } }))?.subscriptionStatus).toBe("active");

    expect((await action(businessA, { kind: "cancel" })).ok).toBe(true);
    const afterCancel = await db.business.findUnique({ where: { id: businessA }, select: { plan: true, subscriptionStatus: true, stripeCustomerId: true, stripeSubscriptionId: true } });
    expect(afterCancel?.plan).toBe("FREE");
    expect(afterCancel?.subscriptionStatus).toBe("canceled");
    expect(afterCancel?.stripeCustomerId).toBe(first?.stripeCustomerId);
    expect(afterCancel?.stripeSubscriptionId).toBe(first?.stripeSubscriptionId);

    const secondCheckout = await action(businessA, { kind: "checkout", plan: "BUSINESS" });
    expect(secondCheckout.ok).toBe(true);
    const final = await db.business.findUnique({ where: { id: businessA }, select: { plan: true, stripeCustomerId: true, stripeSubscriptionId: true } });
    expect(final?.plan).toBe("BUSINESS");
    expect(final?.stripeCustomerId).toBe(first?.stripeCustomerId);
    expect(final?.stripeSubscriptionId).not.toBe(first?.stripeSubscriptionId);
  });

  it("rejects mock billing outside development without modifying the business", async () => {
    for (const env of [
      { ...ON, NODE_ENV: "production" },
      { ...ON, NODE_ENV: "test" },
      { ...ON, VERCEL_ENV: "production" },
      { NODE_ENV: "development" },
    ]) {
      expect(await action(businessA, { kind: "checkout", plan: "PRO" }, env)).toEqual({ ok: false, error: "MOCK_DISABLED" });
    }
    expect(await db.business.findUnique({ where: { id: businessA }, select: { plan: true, stripeCustomerId: true, stripeSubscriptionId: true } })).toEqual({ plan: "FREE", stripeCustomerId: null, stripeSubscriptionId: null });
  });

  it("keeps tenant data isolated and rejects real Stripe identifiers and invalid input", async () => {
    const bCheckout = await action(businessB, { kind: "checkout", plan: "PRO" });
    expect(bCheckout.ok).toBe(true);
    expect((await db.business.findUnique({ where: { id: businessA }, select: { plan: true } }))?.plan).toBe("FREE");
    expect((await db.business.findUnique({ where: { id: businessB }, select: { plan: true } }))?.plan).toBe("PRO");

    await db.business.update({ where: { id: businessA }, data: { plan: "PRO", stripeCustomerId: "cus_real_1", stripeSubscriptionId: "sub_real_1", subscriptionStatus: "active" } });
    for (const input of [{ kind: "checkout", plan: "PRO" }, { kind: "change_plan", plan: "BUSINESS" }, { kind: "payment_failed" }, { kind: "payment_recovered" }, { kind: "cancel" }]) {
      expect(await action(businessA, input)).toMatchObject({ ok: false, error: "NOT_MOCK_SUBSCRIPTION" });
    }
    expect(await action("unknown-business-id", { kind: "checkout", plan: "PRO" })).toEqual({ ok: false, error: "UNKNOWN" });
    expect(await action(businessB, { kind: "refund" })).toEqual({ ok: false, error: "INVALID_INPUT" });
    expect(await db.business.findUnique({ where: { id: businessA }, select: { plan: true, stripeCustomerId: true, stripeSubscriptionId: true } })).toEqual({ plan: "PRO", stripeCustomerId: "cus_real_1", stripeSubscriptionId: "sub_real_1" });
  });
});
