import { billingMessage } from "./messages";

export function mockBillingMessage(code: string): string {
  if (code === "MOCK_DISABLED") return "Mock billing is switched off on this server.";
  if (code === "NO_SUBSCRIPTION") return "There is no mock subscription yet. Choose a plan first.";
  if (code === "NOT_MOCK_SUBSCRIPTION") return "This business has a real Stripe subscription. Use Manage subscription instead.";
  return billingMessage(code);
}
