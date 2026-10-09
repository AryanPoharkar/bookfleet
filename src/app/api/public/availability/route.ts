import { NextRequest, NextResponse } from "next/server";
import { availabilityQuerySchema } from "@/features/public-booking/schemas";
import { getPublicBusiness } from "@/server/tenancy/public-business";
import { getTenantDb } from "@/server/tenancy/tenant-db";
import { getAvailability } from "@/features/availability/get-availability";
export async function GET(request: NextRequest) {
 // RATE-LIMIT-PLACEHOLDER (chunk 12)
 const query = availabilityQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
 if (!query.success) return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400, headers: { "Cache-Control": "no-store" } });
 const { slug, serviceId, staffId, date, rescheduleToken } = query.data;
 const business = await getPublicBusiness(slug); if (!business) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });
 let excludeBookingId: string | undefined;
 if (rescheduleToken) { const booking = await getTenantDb(business.id).booking.findFirst({ where: { cancelToken: rescheduleToken, status: "CONFIRMED" }, select: { id: true } }); if (!booking) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } }); excludeBookingId = booking.id; }
 const result = await getAvailability({ db: getTenantDb(business.id), timezone: business.timezone, serviceId, staffId: staffId ?? null, date, ...(excludeBookingId ? { excludeBookingId } : {}) });
 if (!result.ok) return NextResponse.json({ error: result.error === "INVALID_DATE" ? "INVALID_DATE" : "NOT_FOUND" }, { status: result.error === "INVALID_DATE" ? 400 : 404, headers: { "Cache-Control": "no-store" } });
 return NextResponse.json({ timezone: result.timezone, slots: result.slots.map((slot) => ({ startsAt: slot.startsAt.toISOString() })) }, { headers: { "Cache-Control": "no-store" } });
}
