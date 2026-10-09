/* eslint-disable react-hooks/purity */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPublicBusiness } from "@/server/tenancy/public-business";
import { getTenantDb } from "@/server/tenancy/tenant-db";
import { loadBookingSummary } from "@/features/public-booking/load-booking-summary";
import { getBookableDateRange } from "@/features/availability/local-time";
import { TimePicker } from "@/features/public-booking/components/time-picker";
import { formatLongDateTime } from "@/features/public-booking/time-display";
export default async function ReschedulePage({params}:{params:Promise<{slug:string;token:string}>}) { const {slug,token}=await params; const business=await getPublicBusiness(slug); if(!business) notFound(); const booking=await loadBookingSummary(getTenantDb(business.id),token); if(!booking) notFound(); if(booking.status!=="CONFIRMED"||booking.startsAt.getTime()<=Date.now()) redirect(`/book/${slug}/confirmed/${token}`); const range=getBookableDateRange(new Date(),business.timezone); return <section className="mx-auto max-w-3xl space-y-5"><h1 className="font-heading text-2xl font-semibold">Reschedule your booking</h1><p>Current time: {formatLongDateTime(booking.startsAt,business.timezone)}</p><p className="text-sm text-muted-foreground">Choose a new time, then continue to confirm the change.</p><TimePicker slug={slug} serviceId={booking.serviceId} staffId={booking.staffId} timezone={business.timezone} firstDate={range.firstDate} lastDate={range.lastDate} initialDate={range.firstDate} rescheduleToken={token}/><Link className="underline" href={`/book/${slug}/confirmed/${token}`}>Back to booking</Link></section>; }
