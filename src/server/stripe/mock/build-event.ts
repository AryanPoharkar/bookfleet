import type { Plan } from "@/config/plans";
import type { BillingEvent } from "../types";
import { MOCK_PRICE_MAP, isMockId } from "./ids";

export type MockActionInput =
  | { kind: "checkout"; plan: "PRO" | "BUSINESS" }
  | { kind: "change_plan"; plan: "PRO" | "BUSINESS" }
  | { kind: "payment_failed" }
  | { kind: "payment_recovered" }
  | { kind: "cancel" };

export type MockBusiness = {
  id: string;
  plan: Plan;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
};

export type MockBuildResult =
  | { ok: true; event: BillingEvent }
  | { ok: false; error: "NOT_MOCK_SUBSCRIPTION" | "ALREADY_SUBSCRIBED" | "NO_SUBSCRIPTION" };

export function buildMockEvent({
  input,
  business,
  eventId,
  newCustomerId,
  newSubscriptionId,
}: {
  input: MockActionInput;
  business: MockBusiness;
  eventId: string;
  newCustomerId: string;
  newSubscriptionId: string;
}): MockBuildResult {
  if (
    (business.stripeCustomerId !== null && !isMockId(business.stripeCustomerId))
    || (business.stripeSubscriptionId !== null && !isMockId(business.stripeSubscriptionId))
  ) return { ok: false, error: "NOT_MOCK_SUBSCRIPTION" };

  const live = ["active", "trialing", "past_due"].includes(business.subscriptionStatus ?? "");
  if (input.kind === "checkout") {
    if (live) return { ok: false, error: "ALREADY_SUBSCRIBED" };
    const customerId = business.stripeCustomerId ?? newCustomerId;
    return {
      ok: true,
      event: {
        kind: "checkout_completed",
        eventId,
        stripeType: "checkout.session.completed",
        businessId: business.id,
        customerId,
        subscription: {
          id: newSubscriptionId,
          customerId,
          status: "active",
          priceId: MOCK_PRICE_MAP[input.plan],
          businessId: business.id,
        },
      },
    };
  }

  if (!business.stripeCustomerId || !business.stripeSubscriptionId || !live) {
    return { ok: false, error: "NO_SUBSCRIPTION" };
  }

  if (input.kind === "payment_failed") {
    return {
      ok: true,
      event: {
        kind: "payment_failed",
        eventId,
        stripeType: "invoice.payment_failed",
        customerId: business.stripeCustomerId,
      },
    };
  }

  if (input.kind === "payment_recovered" && business.plan === "FREE") {
    return { ok: false, error: "NO_SUBSCRIPTION" };
  }

  if (input.kind === "cancel") {
    return {
      ok: true,
      event: {
        kind: "subscription_deleted",
        eventId,
        stripeType: "customer.subscription.deleted",
        subscription: {
          id: business.stripeSubscriptionId,
          customerId: business.stripeCustomerId,
          status: "canceled",
          priceId: business.plan === "FREE" ? null : MOCK_PRICE_MAP[business.plan],
          businessId: business.id,
        },
      },
    };
  }

  const plan = input.kind === "change_plan" ? input.plan : business.plan;
  if (plan === "FREE") return { ok: false, error: "NO_SUBSCRIPTION" };
  return {
    ok: true,
    event: {
      kind: "subscription_changed",
      eventId,
      stripeType: "customer.subscription.updated",
      subscription: {
        id: business.stripeSubscriptionId,
        customerId: business.stripeCustomerId,
        status: "active",
        priceId: MOCK_PRICE_MAP[plan],
        businessId: business.id,
      },
    },
  };
}
