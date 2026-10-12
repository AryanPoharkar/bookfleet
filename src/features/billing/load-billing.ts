import type { BusinessPlan } from "@/generated/prisma/client";
import type { TenantDb } from "@/server/tenancy/types";
import { getMonthBounds } from "@/features/bookings/month-bounds";

export type BillingOverview = {
  plan: BusinessPlan;
  subscriptionStatus: string | null;
  hasCustomer: boolean;
  hasSubscription: boolean;
  billingProvider: "STRIPE" | "RAZORPAY" | null;
  hasRazorpaySubscription: boolean;
  activeStaff: number;
  bookingsThisMonth: number;
};

export async function loadBillingOverview({
  db,
  timezone,
  now,
}: {
  db: TenantDb;
  timezone: string;
  now: Date;
}): Promise<BillingOverview> {
  const businessPromise = db.business.findFirst({
    where: {},
    select: {
      plan: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      billingProvider: true,
      razorpaySubscriptionId: true,
    },
  });
  const staffPromise = db.staff.count({ where: { isActive: true } });
  const bounds = getMonthBounds(now, timezone);
  const bookingsPromise = db.booking.count({
    where: {
      status: { not: "CANCELLED" },
      startsAt: { gte: bounds.start, lt: bounds.end },
    },
  });
  const [business, activeStaff, bookingsThisMonth] = await Promise.all([
    businessPromise,
    staffPromise,
    bookingsPromise,
  ]);
  if (!business) throw new Error("Tenant business not found.");
  return {
    plan: business.plan,
    subscriptionStatus: business.subscriptionStatus,
    hasCustomer: Boolean(business.stripeCustomerId),
    hasSubscription: Boolean(business.stripeSubscriptionId),
    billingProvider: business.billingProvider,
    hasRazorpaySubscription: Boolean(business.razorpaySubscriptionId),
    activeStaff,
    bookingsThisMonth,
  };
}
