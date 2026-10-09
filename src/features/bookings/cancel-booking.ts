import type { TenantDb } from "../../server/tenancy/types";
import { BookingFailure } from "./errors";
import { checkBookingAccess, type BookingActor } from "./authorize";
import { bookingRefSchema, type BookingRef } from "./schemas";

export async function cancelBooking({
  db,
  actor,
  ref,
  now = new Date(),
}: {
  db: TenantDb;
  actor: BookingActor;
  ref: unknown;
  now?: Date;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = bookingRefSchema.safeParse(ref);
  if (!parsed.success || (actor.kind === "customer" && !("cancelToken" in parsed.data))) {
    return { ok: false, error: "BOOKING_NOT_FOUND" };
  }
  const bookingRef: BookingRef = parsed.data;
  const tenantDb = db;
  try {
    const booking = await tenantDb.booking.findFirst({
      where: "cancelToken" in bookingRef ? { cancelToken: bookingRef.cancelToken } : { id: bookingRef.bookingId },
      select: { id: true, staffId: true, startsAt: true, status: true },
    });
    if (!booking) throw new BookingFailure("BOOKING_NOT_FOUND");
    const access = checkBookingAccess(actor, { staffId: booking.staffId, startsAt: booking.startsAt }, now);
    if (access !== "OK") throw new BookingFailure(access);
    if (booking.status !== "CONFIRMED") throw new BookingFailure("NOT_CONFIRMED");
    const updated = await tenantDb.booking.updateMany({ where: { id: booking.id, status: "CONFIRMED" }, data: { status: "CANCELLED" } });
    if (updated.count === 0) throw new BookingFailure("NOT_CONFIRMED");
    return { ok: true };
  } catch (error) {
    if (error instanceof BookingFailure) return { ok: false, error: error.code };
    throw error;
  }
}
