import type { BookingStatus } from "@/generated/prisma/client";
import type { TenantDb } from "../../server/tenancy/types";
import { BookingFailure } from "./errors";
import { checkBookingAccess, type BookingActor } from "./authorize";

export async function markBooking({ db, actor, bookingId, status, now = new Date() }: {
  db: TenantDb;
  actor: Extract<BookingActor, { kind: "member" }>;
  bookingId: string;
  status: Extract<BookingStatus, "COMPLETED" | "NO_SHOW">;
  now?: Date;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const booking = await db.booking.findFirst({ where: { id: bookingId }, select: { id: true, staffId: true, startsAt: true, status: true } });
    if (!booking) throw new BookingFailure("BOOKING_NOT_FOUND");
    const access = checkBookingAccess(actor, { staffId: booking.staffId, startsAt: booking.startsAt }, now);
    if (access !== "OK") throw new BookingFailure(access);
    if (booking.status !== "CONFIRMED") throw new BookingFailure("NOT_CONFIRMED");
    if (booking.startsAt > now) return { ok: false, error: "NOT_STARTED" };
    const updated = await db.booking.updateMany({ where: { id: booking.id, status: "CONFIRMED" }, data: { status } });
    if (updated.count === 0) throw new BookingFailure("NOT_CONFIRMED");
    return { ok: true };
  } catch (error) {
    if (error instanceof BookingFailure) return { ok: false, error: error.code };
    throw error;
  }
}
