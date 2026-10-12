import type { BusinessPlan } from "@/generated/prisma/client";

export type Plan = BusinessPlan;
export const PLAN_LIMITS: Record<Plan, { bookingsPerMonth: number | null }> = {
  FREE: { bookingsPerMonth: 50 },
  PRO: { bookingsPerMonth: null },
  BUSINESS: { bookingsPerMonth: null },
};

// Razorpay prices are INR paise per month and independent of Business.currency.
export const PLANS: Record<Plan, { name: string; priceMonthlyCents: number; priceMonthlyInrPaise: number; limits: { activeStaff: number | null; bookingsPerMonth: number | null }; extras: string[] }> = {
  FREE: { name: "Free", priceMonthlyCents: 0, priceMonthlyInrPaise: 0, limits: { activeStaff: 1, bookingsPerMonth: PLAN_LIMITS.FREE.bookingsPerMonth }, extras: [] },
  PRO: { name: "Pro", priceMonthlyCents: 1900, priceMonthlyInrPaise: 149900, limits: { activeStaff: 5, bookingsPerMonth: PLAN_LIMITS.PRO.bookingsPerMonth }, extras: [] },
  BUSINESS: { name: "Business", priceMonthlyCents: 4900, priceMonthlyInrPaise: 399900, limits: { activeStaff: null, bookingsPerMonth: PLAN_LIMITS.BUSINESS.bookingsPerMonth }, extras: ["Priority email support", "No \"Powered by Bookfleet\" line on your booking page"] },
};
