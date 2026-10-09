/* eslint-disable react-hooks/purity */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/server/tenancy/public-business";
import { getTenantDb } from "@/server/tenancy/tenant-db";
import { loadBookingSummary } from "@/features/public-booking/load-booking-summary";
import { formatMoney } from "@/features/services/money";
import { formatLongDateTime } from "@/features/public-booking/time-display";
import { CancelBookingDialog } from "@/features/public-booking/components/cancel-booking-dialog";
export async function generateMetadata(): Promise<Metadata> { return { title: "Booking confirmed", robots: { index: false, follow: false }, referrer: "no-referrer" }; }
export default async function ConfirmedPage({ params }: { params: Promise<{ slug: string; token: string }> }) { const {slug,token}=await params; const business=await getPublicBusiness(slug); if(!business) notFound(); const booking=await loadBookingSummary(getTenantDb(business.id),token); if(!booking) notFound(); const future=booking.startsAt.getTime()>Date.now(); return <section className="mx-auto max-w-xl space-y-5"><h1 className="font-heading text-3xl font-semibold">{booking.status==="CONFIRMED"&&future?"You&apos;re booked.":booking.status==="CANCELLED"?"This booking is cancelled.":"This appointment is finished."}</h1>{booking.status==="CONFIRMED"?<div className="rounded-xl border border-border p-5"><p className="font-semibold">{booking.serviceName}</p><p>{booking.staffName}</p><p>{formatLongDateTime(booking.startsAt,business.timezone)}</p><p>{formatMoney(booking.priceCents,business.currency)}</p><p>{booking.customerName}</p></div>:null}{booking.status==="CONFIRMED"&&future?<div className="flex flex-wrap gap-3"><Link className="rounded-lg border px-4 py-2" href={`/book/${slug}/confirmed/${token}/calendar.ics`}>Add to calendar</Link><Link className="rounded-lg border px-4 py-2" href={`/book/${slug}/reschedule/${token}`}>Reschedule</Link><CancelBookingDialog slug={slug} cancelToken={token}/></div>:null}{booking.status==="CONFIRMED"&&!future?<p>This appointment has already started, so it can&apos;t be changed online. Please contact the business.</p>:null}{booking.status==="CANCELLED"?<Link className="underline" href={`/book/${slug}`}>Book again</Link>:null}<p className="text-sm text-muted-foreground">Keep this page. This link is how you manage your booking.</p></section>; }



