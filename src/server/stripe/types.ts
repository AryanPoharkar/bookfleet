import type Stripe from "stripe";
export type BillingProviderName = "stripe" | "razorpay";
export type SubscriptionSnapshot = { id: string; customerId: string | null; status: string; priceId: string | null; businessId: string | null };
type Base = { eventId: string; stripeType: string; provider?: BillingProviderName };
export type BillingEvent =
 | (Base & { kind: "checkout_completed"; stripeType: "checkout.session.completed"; businessId: string; customerId: string | null; subscription: SubscriptionSnapshot })
 | (Base & { kind: "subscription_changed"; stripeType: "customer.subscription.updated"; subscription: SubscriptionSnapshot })
 | (Base & { kind: "subscription_deleted"; stripeType: "customer.subscription.deleted"; subscription: SubscriptionSnapshot })
 | (Base & { kind: "payment_failed"; stripeType: "invoice.payment_failed"; customerId: string });
export type StripeClient = Stripe;
