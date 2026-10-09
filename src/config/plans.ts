import type { BusinessPlan } from "@/generated/prisma/client";

export const PLAN_LIMITS: Record<BusinessPlan, { bookingsPerMonth: number | null }> = {
  FREE: { bookingsPerMonth: 50 },
  PRO: { bookingsPerMonth: null },
  BUSINESS: { bookingsPerMonth: null },
};
