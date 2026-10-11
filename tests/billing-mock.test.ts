import { describe, expect, it } from "vitest";
import { isMockBillingEnabled } from "../src/server/stripe/mock/guard";
import { getBillingMode } from "../src/server/stripe/billing-mode";
import { isMockId, MOCK_PRICE_MAP } from "../src/server/stripe/mock/ids";
import { buildMockEvent, type MockActionInput, type MockBusiness } from "../src/server/stripe/mock/build-event";
import { mockActionSchema } from "../src/features/billing/mock-schemas";
import { mockBillingMessage } from "../src/features/billing/mock-messages";
import { billingMessage } from "../src/features/billing/messages";

const enabled = { BILLING_MOCK: "true", NODE_ENV: "development" };
const business: MockBusiness = {
  id: "biz1",
  plan: "PRO",
  stripeCustomerId: "cus_mock_1",
  stripeSubscriptionId: "sub_mock_1",
  subscriptionStatus: "active",
};
const build = (input: MockActionInput, overrides: Partial<typeof business> = {}) => buildMockEvent({
  input,
  business: { ...business, ...overrides },
  eventId: "evt_mock_1",
  newCustomerId: "cus_mock_new",
  newSubscriptionId: "sub_mock_new",
});

describe("development mock billing", () => {
  it("guards the mode and selects mock, Stripe, or unavailable", () => {
    expect(isMockBillingEnabled(enabled)).toBe(true);
    for (const value of ["false", undefined, "TRUE", "1", " true"]) {
      expect(isMockBillingEnabled({ NODE_ENV: "development", BILLING_MOCK: value })).toBe(false);
    }
    for (const nodeEnv of ["production", "test", undefined]) {
      expect(isMockBillingEnabled({ BILLING_MOCK: "true", NODE_ENV: nodeEnv })).toBe(false);
    }
    expect(isMockBillingEnabled({ ...enabled, VERCEL: "1" })).toBe(false);
    for (const vercelEnv of ["production", "preview", "development"]) {
      expect(isMockBillingEnabled({ ...enabled, VERCEL_ENV: vercelEnv })).toBe(false);
    }
    const stripe = { NODE_ENV: "production", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_PRO: "price_pro", STRIPE_PRICE_BUSINESS: "price_business" };
    expect(getBillingMode(enabled)).toBe("mock");
    expect(getBillingMode(stripe)).toBe("stripe");
    expect(getBillingMode({ NODE_ENV: "production", BILLING_MOCK: "true" })).toBe("unavailable");
    expect(getBillingMode({ ...stripe, STRIPE_PRICE_BUSINESS: undefined })).toBe("unavailable");
    expect(getBillingMode({ ...stripe, STRIPE_SECRET_KEY: "sk_live_x" })).toBe("unavailable");
    expect(getBillingMode({ ...stripe, ...enabled })).toBe("mock");
  });

  it("validates mock IDs, action schemas, and messages", () => {
    expect(isMockId("cus_mock_1")).toBe(true);
    expect(isMockId("sub_mock_x")).toBe(true);
    expect(isMockId("cus_123")).toBe(false);
    expect(isMockId("sub_123")).toBe(false);
    expect(isMockId("price_mock_pro")).toBe(false);
    expect(isMockId(null)).toBe(false);
    expect(isMockId(undefined)).toBe(false);
    for (const input of [
      { kind: "checkout", plan: "PRO" },
      { kind: "change_plan", plan: "BUSINESS" },
      { kind: "payment_failed" },
      { kind: "payment_recovered" },
      { kind: "cancel" },
    ]) expect(mockActionSchema.safeParse(input).success).toBe(true);
    for (const input of [
      { kind: "checkout", plan: "FREE" },
      { kind: "change_plan" },
      { kind: "refund" },
      {},
    ]) expect(mockActionSchema.safeParse(input).success).toBe(false);
    expect(mockBillingMessage("MOCK_DISABLED")).toBe("Mock billing is switched off on this server.");
    expect(mockBillingMessage("NO_SUBSCRIPTION")).toBe("There is no mock subscription yet. Choose a plan first.");
    expect(mockBillingMessage("NOT_MOCK_SUBSCRIPTION")).toBe("This business has a real Stripe subscription. Use Manage subscription instead.");
    expect(mockBillingMessage("ALREADY_SUBSCRIBED")).toBe(billingMessage("ALREADY_SUBSCRIBED"));
    expect(MOCK_PRICE_MAP).toEqual({ PRO: "price_mock_pro", BUSINESS: "price_mock_business" });
  });

  it("builds checkout events and refuses a second live checkout", () => {
    const free = buildMockEvent({
      input: { kind: "checkout", plan: "PRO" },
      business: { id: "biz1", plan: "FREE", stripeCustomerId: null, stripeSubscriptionId: null, subscriptionStatus: null },
      eventId: "evt_mock_1", newCustomerId: "cus_mock_new", newSubscriptionId: "sub_mock_new",
    });
    expect(free).toEqual({ ok: true, event: {
      kind: "checkout_completed", eventId: "evt_mock_1", stripeType: "checkout.session.completed", businessId: "biz1", customerId: "cus_mock_new",
      subscription: { id: "sub_mock_new", customerId: "cus_mock_new", status: "active", priceId: "price_mock_pro", businessId: "biz1" },
    } });
    const businessPlan = buildMockEvent({
      input: { kind: "checkout", plan: "BUSINESS" },
      business: { id: "biz1", plan: "FREE", stripeCustomerId: null, stripeSubscriptionId: null, subscriptionStatus: null },
      eventId: "evt_mock_1", newCustomerId: "cus_mock_new", newSubscriptionId: "sub_mock_new",
    });
    expect(businessPlan.ok && businessPlan.event.kind === "checkout_completed" ? businessPlan.event.subscription.priceId : null).toBe("price_mock_business");
    const canceled = buildMockEvent({ input: { kind: "checkout", plan: "PRO" }, business: { ...business, subscriptionStatus: "canceled" }, eventId: "evt_mock_1", newCustomerId: "cus_mock_new", newSubscriptionId: "sub_mock_new" });
    expect(canceled.ok && canceled.event.kind === "checkout_completed" ? canceled.event.customerId : null).toBe("cus_mock_1");
    expect(canceled.ok && canceled.event.kind === "checkout_completed" ? canceled.event.subscription.id : null).toBe("sub_mock_new");
    for (const status of ["active", "past_due", "trialing"]) {
      expect(build({ kind: "checkout", plan: "PRO" }, { subscriptionStatus: status })).toEqual({ ok: false, error: "ALREADY_SUBSCRIBED" });
    }
  });

  it("builds plan-change, failure, recovery, and cancellation events safely", () => {
    expect(build({ kind: "change_plan", plan: "BUSINESS" })).toMatchObject({ ok: true, event: { kind: "subscription_changed", stripeType: "customer.subscription.updated", subscription: { id: "sub_mock_1", customerId: "cus_mock_1", status: "active", priceId: "price_mock_business" } } });
    expect(build({ kind: "payment_failed" })).toMatchObject({ ok: true, event: { kind: "payment_failed", stripeType: "invoice.payment_failed", customerId: "cus_mock_1" } });
    expect(build({ kind: "payment_recovered" }, { subscriptionStatus: "past_due" })).toMatchObject({ ok: true, event: { kind: "subscription_changed", stripeType: "customer.subscription.updated", subscription: { status: "active", priceId: "price_mock_pro" } } });
    expect(build({ kind: "cancel" })).toMatchObject({ ok: true, event: { kind: "subscription_deleted", stripeType: "customer.subscription.deleted", subscription: { status: "canceled", priceId: "price_mock_pro" } } });
    const free: MockBusiness = { id: "biz1", plan: "FREE", stripeCustomerId: null, stripeSubscriptionId: null, subscriptionStatus: null };
    for (const input of [{ kind: "change_plan", plan: "PRO" }, { kind: "payment_failed" }, { kind: "payment_recovered" }, { kind: "cancel" }] satisfies MockActionInput[]) {
      expect(buildMockEvent({ input, business: free, eventId: "evt_mock_1", newCustomerId: "cus_mock_new", newSubscriptionId: "sub_mock_new" })).toEqual({ ok: false, error: "NO_SUBSCRIPTION" });
    }
    for (const input of [{ kind: "change_plan", plan: "PRO" }, { kind: "payment_failed" }, { kind: "payment_recovered" }, { kind: "cancel" }] satisfies MockActionInput[]) {
      expect(build(input, { subscriptionStatus: "canceled" })).toEqual({ ok: false, error: "NO_SUBSCRIPTION" });
    }
    for (const input of [{ kind: "checkout", plan: "PRO" }, { kind: "change_plan", plan: "BUSINESS" }, { kind: "payment_failed" }, { kind: "payment_recovered" }, { kind: "cancel" }] satisfies MockActionInput[]) {
      expect(buildMockEvent({ input, business: { ...business, stripeCustomerId: "cus_123" }, eventId: "evt_mock_1", newCustomerId: "cus_mock_new", newSubscriptionId: "sub_mock_new" })).toEqual({ ok: false, error: "NOT_MOCK_SUBSCRIPTION" });
    }
    expect(buildMockEvent({ input: { kind: "checkout", plan: "PRO" }, business: { ...business, stripeSubscriptionId: "sub_123" }, eventId: "evt_mock_1", newCustomerId: "cus_mock_new", newSubscriptionId: "sub_mock_new" })).toEqual({ ok: false, error: "NOT_MOCK_SUBSCRIPTION" });
  });
});
