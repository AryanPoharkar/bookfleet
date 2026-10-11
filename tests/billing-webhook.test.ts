import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { db } from "../src/server/db";
import { handleStripeWebhook } from "../src/server/stripe/handle-webhook";

const suffix = randomBytes(8).toString("hex");
const slugA = `vitest-hook-a-${suffix}`;
const slugB = `vitest-hook-b-${suffix}`;
const prefix = "evt_vitest_hook_";
const secret = "whsec_vitest";
let businessA = "";
let businessB = "";
const stripe = new Stripe("sk_test_dummy");

async function removeBusinesses() {
  await db.business.deleteMany({ where: { slug: { in: [slugA, slugB] } } });
}

function payload(id: string, type: string, object: Record<string, unknown>) {
  return JSON.stringify({
    id,
    object: "event",
    api_version: "2025-01-01",
    created: 1,
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type,
  });
}

async function send(body: string, signingSecret = secret, signatureBody = body, includeSignature = true) {
  const signature = includeSignature
    ? stripe.webhooks.generateTestHeaderString({ payload: signatureBody, secret: signingSecret })
    : null;
  return handleStripeWebhook(new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    body,
  }));
}

function subscription(id: string, businessId: string, customer: string, price: string, status = "active") {
  return { object: "subscription", id, customer, status, metadata: { businessId }, items: { data: [{ price: { id: price } }] } };
}

beforeAll(async () => {
  await removeBusinesses();
  businessA = (await db.business.create({ data: { name: slugA, slug: slugA, timezone: "UTC", plan: "FREE" }, select: { id: true } })).id;
  businessB = (await db.business.create({ data: { name: slugB, slug: slugB, timezone: "UTC", plan: "FREE" }, select: { id: true } })).id;
});

beforeEach(async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
  vi.stubEnv("STRIPE_PRICE_PRO", "price_vitest_pro");
  vi.stubEnv("STRIPE_PRICE_BUSINESS", "price_vitest_business");
  await db.stripeEvent.deleteMany({ where: { stripeEventId: { startsWith: prefix } } });
  await db.business.updateMany({ where: { id: { in: [businessA, businessB] } }, data: { plan: "FREE", stripeCustomerId: null, stripeSubscriptionId: null, subscriptionStatus: null } });
});

afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await db.stripeEvent.deleteMany({ where: { stripeEventId: { startsWith: prefix } } });
  await removeBusinesses();
});

describe("Stripe webhook verification and event application", () => {
  it("rejects missing, invalid, and altered signatures and reports missing configuration", async () => {
    const body = payload(`${prefix}reject`, "customer.subscription.updated", subscription("sub_reject", businessA, "cus_reject", "price_vitest_pro"));
    expect((await send(body, secret, body, false)).status).toBe(400);
    expect((await send(body, "whsec_wrong")).status).toBe(400);
    const signed = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
    const changed = body.replace("sub_reject", "sub_changed");
    const alteredResponse = await handleStripeWebhook(new Request("http://localhost/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": signed }, body: changed }));
    expect(alteredResponse.status).toBe(400);
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect((await send(body)).status).toBe(500);
    expect((await db.business.findUnique({ where: { id: businessA }, select: { plan: true } }))?.plan).toBe("FREE");
    expect(await db.stripeEvent.count({ where: { stripeEventId: { startsWith: prefix } } })).toBe(0);
  });

  it("applies trusted subscription events once, then handles failure and cancellation", async () => {
    const eventId = `${prefix}lifecycle`;
    const body = payload(eventId, "customer.subscription.updated", subscription("sub_vitest_hook_a", businessA, "cus_vitest_hook_a", "price_vitest_pro"));
    const first = await send(body);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ received: true, result: "applied" });
    expect(await db.business.findUnique({ where: { id: businessA }, select: { plan: true, stripeCustomerId: true, stripeSubscriptionId: true } })).toEqual({ plan: "PRO", stripeCustomerId: "cus_vitest_hook_a", stripeSubscriptionId: "sub_vitest_hook_a" });
    expect(await (await send(body)).json()).toMatchObject({ received: true, result: "duplicate" });
    expect(await db.stripeEvent.count({ where: { stripeEventId: eventId } })).toBe(1);

    const businessBody = payload(`${prefix}business`, "customer.subscription.updated", subscription("sub_vitest_hook_a", businessA, "cus_vitest_hook_a", "price_vitest_business"));
    expect(await (await send(businessBody)).json()).toMatchObject({ result: "applied" });
    const failedBody = payload(`${prefix}failed`, "invoice.payment_failed", { object: "invoice", customer: "cus_vitest_hook_a" });
    expect(await (await send(failedBody)).json()).toMatchObject({ result: "applied" });
    expect(await db.business.findUnique({ where: { id: businessA }, select: { plan: true, subscriptionStatus: true } })).toEqual({ plan: "BUSINESS", subscriptionStatus: "past_due" });
    const deletedBody = payload(`${prefix}deleted`, "customer.subscription.deleted", subscription("sub_vitest_hook_a", businessA, "cus_vitest_hook_a", "price_vitest_business", "canceled"));
    expect(await (await send(deletedBody)).json()).toMatchObject({ result: "applied" });
    expect(await db.business.findUnique({ where: { id: businessA }, select: { plan: true, subscriptionStatus: true, stripeCustomerId: true, stripeSubscriptionId: true } })).toEqual({ plan: "FREE", subscriptionStatus: "canceled", stripeCustomerId: "cus_vitest_hook_a", stripeSubscriptionId: "sub_vitest_hook_a" });
  });

  it("isolates businesses and ignores events for unknown businesses", async () => {
    const bodyB = payload(`${prefix}business-b`, "customer.subscription.updated", subscription("sub_vitest_hook_b", businessB, "cus_vitest_hook_b", "price_vitest_pro"));
    expect(await (await send(bodyB)).json()).toMatchObject({ result: "applied" });
    expect(await db.business.findUnique({ where: { id: businessB }, select: { plan: true } })).toEqual({ plan: "PRO" });
    expect(await db.business.findUnique({ where: { id: businessA }, select: { plan: true } })).toEqual({ plan: "FREE" });

    const missing = payload(`${prefix}missing`, "customer.subscription.updated", subscription("sub_missing", "missing-business-id", "cus_missing", "price_vitest_pro"));
    expect(await (await send(missing)).json()).toMatchObject({ received: true, result: "ignored" });
    expect(await db.business.findUnique({ where: { id: businessA }, select: { plan: true } })).toEqual({ plan: "FREE" });
  });
});
