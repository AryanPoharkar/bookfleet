import type { TenantDb } from "../../server/tenancy/types";
import { getTenantDb } from "../../server/tenancy/tenant-db";
import { BookingFailure } from "./errors";
import { isExclusionViolation, isUniqueViolation } from "./db-errors";
import { checkBookingAccess, type BookingActor } from "./authorize";
import { bookingRefSchema, type BookingRef } from "./schemas";
import { findOfferedSlot } from "./find-offered-slot";

export async function rescheduleBooking({
  db,
  businessId,
  actor,
  ref,
  newStartsAt,
  now = new Date(),
}: {
  db?: TenantDb;
  businessId: string;
  actor: BookingActor;
  ref: unknown;
  newStartsAt: Date;
  now?: Date;
}): Promise<{ ok: true; booking: { id: string; cancelToken: string; startsAt: Date; endsAt: Date; status: "CONFIRMED" } } | { ok: false; error: string; via?: "CHECK" | "CONSTRAINT" }> {
  const parsed = bookingRefSchema.safeParse(ref);
  if (!parsed.success || (actor.kind === "customer" && !("cancelToken" in parsed.data))) return { ok: false, error: "BOOKING_NOT_FOUND" };
  const bookingRef: BookingRef = parsed.data;
  const tenantDb = db ?? getTenantDb(businessId);
  const runTransaction = async () => tenantDb.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: "cancelToken" in bookingRef ? { cancelToken: bookingRef.cancelToken } : { id: bookingRef.bookingId },
      select: { id: true, serviceId: true, staffId: true, startsAt: true, status: true, cancelToken: true },
    });
    if (!booking) throw new BookingFailure("BOOKING_NOT_FOUND");
    const access = checkBookingAccess(actor, { staffId: booking.staffId, startsAt: booking.startsAt }, now);
    if (access !== "OK") throw new BookingFailure(access);
    if (booking.status !== "CONFIRMED") throw new BookingFailure("NOT_CONFIRMED");
    const cancelled = await tx.booking.updateMany({ where: { id: booking.id, status: "CONFIRMED" }, data: { status: "CANCELLED" } });
    if (cancelled.count !== 1) throw new BookingFailure("NOT_CONFIRMED");

    const business = await tx.business.findFirst({ where: { id: businessId }, select: { timezone: true } });
    if (!business) throw new BookingFailure("BOOKING_NOT_FOUND");
    // Rescheduling an existing booking does not consume another monthly booking allowance.
    const offered = await findOfferedSlot({ db: tx, timezone: business.timezone, serviceId: booking.serviceId, staffId: booking.staffId, startsAt: newStartsAt, now });
    if (!offered) throw new BookingFailure("SLOT_TAKEN", "CHECK");
    const endsAt = new Date(newStartsAt.getTime() + offered.durationMinutes * 60_000);
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { startsAt: newStartsAt, endsAt, status: "CONFIRMED" },
      select: { id: true, cancelToken: true, startsAt: true, endsAt: true },
    });
    return { id: updated.id, cancelToken: updated.cancelToken, startsAt: updated.startsAt, endsAt: updated.endsAt, status: "CONFIRMED" as const };
  }, { maxWait: 10000, timeout: 15000 });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return { ok: true, booking: await runTransaction() };
    } catch (error) {
      if (error instanceof BookingFailure) return { ok: false, error: error.code, ...(error.via ? { via: error.via } : {}) };
      if (isExclusionViolation(error)) return { ok: false, error: "SLOT_TAKEN", via: "CONSTRAINT" };
      if (isUniqueViolation(error) && attempt === 0) continue;
      throw error;
    }
  }
  throw new Error("Reschedule transaction retry exhausted unexpectedly.");
}
