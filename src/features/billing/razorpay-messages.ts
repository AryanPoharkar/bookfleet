import { billingMessage } from "./messages";
export function razorpayMessage(code: string): string {
  if (code === "PROVIDER_ERROR") return "We couldn't reach Razorpay. Please try again.";
  if (code === "PAYMENT_NOT_VERIFIED") return "We couldn't verify that payment. If you were charged, your plan will still update once Razorpay confirms it.";
  if (code === "NO_SUBSCRIPTION") return "There is no active subscription to cancel.";
  return billingMessage(code);
}
