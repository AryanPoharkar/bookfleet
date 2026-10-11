import { notFound } from "next/navigation";
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { PLANS } from "@/config/plans";
import { loadBillingOverview } from "@/features/billing/load-billing";
import { describeOverage, describeSubscriptionStatus } from "@/features/billing/rules";
import { BillingActionButton } from "@/features/billing/components/billing-actions";
import { CheckoutPending } from "@/features/billing/components/checkout-pending";
import { formatMoney } from "@/features/services/money";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
export default async function BillingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ checkout?: string }> }) {
 const { slug } = await params; const query = await searchParams; const tenant = await requireTenant(slug);
 try { requirePermission(tenant, "billing:manage"); } catch { notFound(); }
 const overview = await loadBillingOverview({ db: tenant.db, timezone: tenant.business.timezone, now: new Date() });
 const status = describeSubscriptionStatus(overview.subscriptionStatus);
 const activeSubscription = ["active", "trialing", "past_due"].includes(overview.subscriptionStatus ?? "");
 const usage = PLANS[overview.plan].limits.bookingsPerMonth;
 return <div className="space-y-6"><PageHeader title="Billing" description="Manage your Bookfleet plan and subscription." />
 {describeOverage(overview.plan, overview.activeStaff) ? <p role="alert" className="rounded-md border p-3 text-sm">{describeOverage(overview.plan, overview.activeStaff)}</p> : null}
 {overview.subscriptionStatus === "past_due" ? <p role="alert" className="rounded-md border p-3 text-sm">Your last payment failed. Update your payment method under Manage subscription.</p> : null}
 {query.checkout === "cancelled" ? <p role="status" className="rounded-md border p-3 text-sm">Checkout cancelled. You haven&apos;t been charged.</p> : null}
 {query.checkout === "success" && overview.plan === "FREE" ? <div><p role="status" className="rounded-md border p-3 text-sm">Payment received. Your plan updates as soon as Stripe confirms it.</p><CheckoutPending /></div> : null}
 <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]"><section className="space-y-4 rounded-lg border p-5"><h2 className="font-semibold">Your plan</h2><p className="text-2xl font-semibold">{PLANS[overview.plan].name}</p><Badge variant={status.tone}>{status.label}</Badge><p className="text-sm">{overview.activeStaff} of {PLANS[overview.plan].limits.activeStaff ?? "Unlimited"} active staff</p><p className="text-sm">{usage === null ? `${overview.bookingsThisMonth} bookings this month Â· Unlimited` : `${overview.bookingsThisMonth} of ${usage} bookings this month`}</p>{overview.hasCustomer ? <BillingActionButton slug={slug} label="Manage subscription" /> : null}</section>
 <section className="min-w-0 overflow-hidden rounded-lg border"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Price</TableHead><TableHead>Active staff</TableHead><TableHead>Bookings per month</TableHead><TableHead>Extras</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>{(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((plan) => <TableRow key={plan}><TableCell>{PLANS[plan].name} {overview.plan === plan ? <Badge>Current</Badge> : null}</TableCell><TableCell>{formatMoney(PLANS[plan].priceMonthlyCents, "USD")} / month</TableCell><TableCell>{PLANS[plan].limits.activeStaff ?? "Unlimited"}</TableCell><TableCell>{PLANS[plan].limits.bookingsPerMonth ?? "Unlimited"}</TableCell><TableCell>{PLANS[plan].extras.join(", ") || "â€”"}</TableCell><TableCell>{plan !== "FREE" && !activeSubscription && overview.plan !== plan ? <BillingActionButton slug={slug} plan={plan} label={`Choose ${PLANS[plan].name}`} /> : activeSubscription && plan !== "FREE" ? <span className="text-xs text-muted-foreground">Change or cancel your plan under Manage subscription.</span> : null}</TableCell></TableRow>)}</TableBody></Table></div></section></div><p className="text-sm text-muted-foreground">Stripe test mode: no real money moves. Test card 4242 4242 4242 4242.</p></div>;
}
