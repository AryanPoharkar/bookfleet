export type BillingErrorCode = "INVALID_INPUT" | "ALREADY_SUBSCRIBED" | "NO_CUSTOMER" | "NOT_CONFIGURED" | "STRIPE_ERROR" | "UNKNOWN";
export function billingMessage(code: BillingErrorCode | string): string {
 const messages: Record<BillingErrorCode, string> = {
  INVALID_INPUT: "Please pick a plan and try again.",
  ALREADY_SUBSCRIBED: "You already have a subscription. Use Manage subscription to change plan.",
  NO_CUSTOMER: "No billing account yet. Choose a plan first.",
  NOT_CONFIGURED: "Billing isn't set up on this server yet.",
  STRIPE_ERROR: "We couldn't reach Stripe. Please try again.",
  UNKNOWN: "Something went wrong on our side. Please try again.",
 };
 return messages[code as BillingErrorCode] ?? messages.UNKNOWN;
}
