import { notFound } from "next/navigation";
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { PLANS } from "@/config/plans";
import { loadBillingOverview } from "@/features/billing/load-billing";
import { describeOverage, describeSubscriptionStatus } from "@/features/billing/rules";
import { BillingActionButton } from "@/features/billing/components/billing-actions";
import { RazorpayCancelButton } from "@/features/billing/components/razorpay-cancel-button";
import { CheckoutPending } from "@/features/billing/components/checkout-pending";
import { MockBillingPanel } from "@/features/billing/components/mock-billing-panel";
import { formatMoney } from "@/features/services/money";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBillingMode } from "@/server/stripe/billing-mode";
import type { Plan } from "@/config/plans";

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const tenant = await requireTenant(slug);
  try {
    requirePermission(tenant, "billing:manage");
  } catch {
    notFound();
  }

  const mode = getBillingMode();
  const overview = await loadBillingOverview({
    db: tenant.db,
    timezone: tenant.business.timezone,
    now: new Date(),
  });
  const status = describeSubscriptionStatus(overview.subscriptionStatus);
  const activeSubscription = ["active", "trialing", "past_due"].includes(overview.subscriptionStatus ?? "");
  const usage = PLANS[overview.plan].limits.bookingsPerMonth;
  const providerForMode = mode === "stripe" ? "STRIPE" : mode === "razorpay" ? "RAZORPAY" : null;
  const managedElsewhere = mode !== "mock" && activeSubscription && overview.billingProvider !== null && overview.billingProvider !== providerForMode;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="Billing" description="Manage your Bookfleet plan and subscription." />
      {mode === "mock" ? (
        <p role="status" className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-950">
          Development mock billing is on. No real payment happens. This panel does not exist in production.
        </p>
      ) : null}
      {describeOverage(overview.plan, overview.activeStaff) ? (
        <p role="alert" className="rounded-md border p-3 text-sm">{describeOverage(overview.plan, overview.activeStaff)}</p>
      ) : null}
      {overview.subscriptionStatus === "past_due" ? (
        <p role="alert" className="rounded-md border p-3 text-sm">{mode === "razorpay" ? "Your last payment failed. Razorpay will retry it automatically. Check your email from Razorpay to update your payment method." : "Your last payment failed. Update your payment method under Manage subscription."}</p>
      ) : null}
      {query.checkout === "cancelled" ? <p role="status" className="rounded-md border p-3 text-sm">Checkout cancelled. You haven&apos;t been charged.</p> : null}
      {query.checkout === "success" && overview.plan === "FREE" && mode === "stripe" ? (
        <div>
          <p role="status" className="rounded-md border p-3 text-sm">Payment received. Your plan updates as soon as Stripe confirms it.</p>
          <CheckoutPending />
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="min-w-0 space-y-4 rounded-lg border p-5">
          <h2 className="font-semibold">Your plan</h2>
          <p className="text-2xl font-semibold">{PLANS[overview.plan].name}</p>
          <Badge variant={status.tone}>{status.label}</Badge>
          <p className="text-sm">{overview.activeStaff} of {PLANS[overview.plan].limits.activeStaff ?? "Unlimited"} active staff</p>
          <p className="text-sm">
            {usage === null
              ? <>{overview.bookingsThisMonth} bookings this month <span aria-hidden="true">{"\u00B7"}</span> Unlimited</>
              : `${overview.bookingsThisMonth} of ${usage} bookings this month`}
          </p>
          {overview.billingProvider === "RAZORPAY" && mode === "razorpay" && activeSubscription ? <p className="text-sm">Billed through Razorpay</p> : null}
          {managedElsewhere ? <p className="text-sm">This subscription is managed through {overview.billingProvider === "RAZORPAY" ? "Razorpay" : "Stripe"}.</p> : null}
          {!managedElsewhere && mode === "stripe" && overview.hasCustomer ? <BillingActionButton slug={slug} label="Manage subscription" mode={mode} /> : null}
          {!managedElsewhere && mode === "razorpay" && overview.hasRazorpaySubscription && activeSubscription ? <><RazorpayCancelButton slug={slug} /><p className="text-xs text-muted-foreground">To switch plans, cancel and choose another plan.</p></> : null}
          {mode === "razorpay" ? <p className="text-xs text-muted-foreground">Razorpay test mode: no real money moves. Use <a className="underline" href="https://razorpay.com/docs/payments/recurring-payments/cards/test-cards" target="_blank" rel="noopener noreferrer">Razorpay&apos;s test cards</a>.</p> : null}
          {mode === "mock" ? <MockBillingPanel slug={slug} plan={overview.plan} subscriptionStatus={overview.subscriptionStatus} hasSubscriptionIds={overview.hasCustomer && overview.hasSubscription} /> : null}
        </section>

        <section className="min-w-0 overflow-hidden rounded-lg border">
          <div className="min-w-0 overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Active staff</TableHead>
                  <TableHead>Bookings per month</TableHead>
                  <TableHead>Extras</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(["FREE", "PRO", "BUSINESS"] satisfies Plan[]).map((plan) => (
                  <TableRow key={plan}>
                    <TableCell>{PLANS[plan].name} {overview.plan === plan ? <Badge>Current</Badge> : null}</TableCell>
                    <TableCell>{mode === "razorpay" ? `${formatMoney(PLANS[plan].priceMonthlyInrPaise, "INR")} / month` : `${formatMoney(PLANS[plan].priceMonthlyCents, "USD")} / month`}</TableCell>
                    <TableCell>{PLANS[plan].limits.activeStaff ?? "Unlimited"}</TableCell>
                    <TableCell>{PLANS[plan].limits.bookingsPerMonth ?? "Unlimited"}</TableCell>
                    <TableCell>
                      {PLANS[plan].extras.length > 0
                        ? PLANS[plan].extras.join(", ")
                        : <><span aria-hidden="true">{"\u2013"}</span><span className="sr-only">None</span></>}
                    </TableCell>
                    <TableCell>
                      {plan !== "FREE" && !activeSubscription && overview.plan !== plan && !managedElsewhere ? (
                        <BillingActionButton slug={slug} plan={plan} label={`Choose ${PLANS[plan].name}`} mode={mode} />
                      ) : activeSubscription && plan !== "FREE" && !managedElsewhere ? (
                        <span className="text-xs text-muted-foreground">
                          {mode === "mock" ? "Use the development simulation panel to change or cancel your plan." : mode === "razorpay" ? "To switch plans, cancel and choose another plan." : "Change or cancel your plan under Manage subscription."}
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
      {mode === "stripe" ? <p className="text-sm text-muted-foreground">Stripe test mode: no real money moves. Test card 4242 4242 4242 4242.</p> : null}
    </div>
  );
}
