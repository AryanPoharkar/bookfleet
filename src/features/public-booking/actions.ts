"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPublicBusiness } from "@/server/tenancy/public-business";
import { getTenantDb } from "@/server/tenancy/tenant-db";
import { createBooking } from "@/features/bookings/create-booking";
import { cancelBooking } from "@/features/bookings/cancel-booking";
import { rescheduleBooking } from "@/features/bookings/reschedule-booking";
import { createBookingSchema } from "@/features/bookings/schemas";
import { slugSchema } from "./schemas";
import { bookingErrorMessage } from "./messages";
export async function createPublicBookingAction(input: unknown) {
 // RATE-LIMIT-PLACEHOLDER (chunk 12)
 const data = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
 const slug = slugSchema.safeParse(data.slug); if (!slug.success) return { error: "UNKNOWN", message: bookingErrorMessage("UNKNOWN") };
 const business = await getPublicBusiness(slug.data); if (!business) return { error: "UNKNOWN", message: bookingErrorMessage("UNKNOWN") };
 let result; try { result = await createBooking({ businessId: business.id, input, now: new Date() }); } catch { return { error: "UNKNOWN", message: bookingErrorMessage("UNKNOWN") }; } if (!result.ok) return { error: result.error, message: bookingErrorMessage(result.error) }; redirect(`/book/${business.slug}/confirmed/${result.booking.cancelToken}`);
}
export async function cancelPublicBookingAction({ slug, cancelToken }: { slug: string; cancelToken: string }) {
 // RATE-LIMIT-PLACEHOLDER (chunk 12)
 const parsed = slugSchema.safeParse(slug); if (!parsed.success) return { error: "UNKNOWN", message: bookingErrorMessage("UNKNOWN") };
 const business = await getPublicBusiness(parsed.data); if (!business) return { error: "UNKNOWN", message: bookingErrorMessage("UNKNOWN") };
 const result = await cancelBooking({ db: getTenantDb(business.id), actor: { kind: "customer" }, ref: { cancelToken }, now: new Date() });
 if (!result.ok) return { error: result.error, message: bookingErrorMessage(result.error) };
 revalidatePath(`/book/${business.slug}/confirmed/${cancelToken}`); return { success: true as const };
}
export async function reschedulePublicBookingAction({ slug, cancelToken, newStartsAt }: { slug: string; cancelToken: string; newStartsAt: unknown }) {
 // RATE-LIMIT-PLACEHOLDER (chunk 12)
 const parsed = slugSchema.safeParse(slug); const startsAt = createBookingSchema.shape.startsAt.safeParse(newStartsAt);
 if (!parsed.success || !startsAt.success) return { error: "INVALID_INPUT", message: bookingErrorMessage("INVALID_INPUT") };
 const business = await getPublicBusiness(parsed.data); if (!business) return { error: "UNKNOWN", message: bookingErrorMessage("UNKNOWN") };
 const result = await rescheduleBooking({ businessId: business.id, actor: { kind: "customer" }, ref: { cancelToken }, newStartsAt: startsAt.data, now: new Date() });
 if (!result.ok) return { error: result.error, message: bookingErrorMessage(result.error) };
 redirect(`/book/${business.slug}/confirmed/${cancelToken}`);
}
