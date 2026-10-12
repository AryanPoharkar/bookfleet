import type { Plan } from "@/config/plans";

type ButtonState = "start" | "switch" | "current";

export function getMockPanelState(input: {
  plan: Plan;
  subscriptionStatus: string | null;
  hasSubscriptionIds: boolean;
}): {
  hasLive: boolean;
  switchButtons: { PRO: ButtonState; BUSINESS: ButtonState };
  paymentFailed: boolean;
  paymentRecovered: boolean;
  cancel: boolean;
} {
  const hasLive = ["active", "trialing", "past_due"].includes(input.subscriptionStatus ?? "") && input.hasSubscriptionIds;
  const button = (plan: "PRO" | "BUSINESS"): ButtonState => !hasLive ? "start" : input.plan === plan ? "current" : "switch";
  return {
    hasLive,
    switchButtons: { PRO: button("PRO"), BUSINESS: button("BUSINESS") },
    paymentFailed: hasLive,
    paymentRecovered: hasLive && input.subscriptionStatus === "past_due",
    cancel: hasLive,
  };
}
