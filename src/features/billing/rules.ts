import type { Plan } from "@/config/plans";
import { PLANS } from "@/config/plans";

export function checkStaffLimit(plan: Plan, activeCount: number) {
  const limit = PLANS[plan].limits.activeStaff;
  return { allowed: limit === null || activeCount < limit, limit };
}

export function staffLimitMessage(plan: Plan): string {
  if (plan === "FREE") return "Your Free plan allows 1 active staff member. Ask the owner to upgrade under Billing to add more.";
  if (plan === "PRO") return "Your Pro plan allows 5 active staff members. Ask the owner to upgrade under Billing to add more.";
  return "Your Business plan has unlimited active staff members.";
}

export function describeOverage(plan: Plan, activeStaff: number): string | null {
  const limit = PLANS[plan].limits.activeStaff;
  if (limit === null || activeStaff <= limit) return null;
  return `You have ${activeStaff} active staff, but the ${PLANS[plan].name} plan allows ${limit}. Nothing was deleted. You can't add or restore staff until you're within the limit.`;
}

export function shouldShowPoweredBy(plan: Plan): boolean {
  return plan !== "BUSINESS";
}

export function describeSubscriptionStatus(status: string | null): {
  label: string;
  tone: "default" | "destructive" | "outline" | "ghost";
} {
  if (status === "active") return { label: "Active", tone: "default" };
  if (status === "trialing") return { label: "Trial", tone: "ghost" };
  if (status === "past_due") return { label: "Payment failed", tone: "destructive" };
  if (status === "canceled") return { label: "Cancelled", tone: "outline" };
  if (status === "unpaid") return { label: "Unpaid", tone: "destructive" };
  if (status === "incomplete") return { label: "Incomplete", tone: "ghost" };
  if (status === null) return { label: "No subscription", tone: "outline" };
  return { label: "Unknown", tone: "outline" };
}
