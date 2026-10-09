import { randomBytes } from "node:crypto";
import type { BusinessPlan } from "@/generated/prisma/client";
import { getTenantDb } from "../../server/tenancy/tenant-db";
import { lockBusinessRow } from "../../server/tenancy/lock-business";
import type { TenantDb } from "../../server/tenancy/types";
import { PLAN_LIMITS } from "../../config/plans";
import { findOfferedSlot } from "./find-offered-slot";
import { BookingFailure } from "./errors";
import { isExclusionViolation, isUniqueViolation } from "./db-errors";
import { getMonthBounds } from "./month-bounds";
import { createBookingSchema } from "./schemas";

// The transaction keeps customer and booking writes consistent; the exclusion constraint is the final guard against concurrent overlapping bookings.
// Availability checks alone can race when two requests inspect the same free slot.

export async function createBooking({
  db,
  businessId,
  input,
  now = new Date(),
}: {
  db?: TenantDb;
  businessId: string;
  input: unknown;
  now?: Date;
}): Promise<
  | { ok: true; booking: { id: string; cancelToken: string; serviceId: string; staffId: string; customerId: string; startsAt: Date; endsAt: Date; priceCents: number } }
  | { ok: false; error: string; via?: "CHECK" | "CONSTRAINT" }
> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const data = parsed.data;
  const tenantDb = db ?? getTenantDb(businessId);

  const runTransaction = async () => tenantDb.$transaction(async (tx) => {
    const business = await tx.business.findFirst({
      where: { id: businessId },
      select: { id: true, timezone: true, plan: true },
    });
    if (!business) throw new BookingFailure("SERVICE_NOT_FOUND");

    const service = await tx.service.findFirst({
      where: { id: data.serviceId, isActive: true },
      select: { id: true, name: true, durationMin: true, priceCents: true },
    });
    if (!service) throw new BookingFailure("SERVICE_NOT_FOUND");

    const plan = business.plan as BusinessPlan;
    const limit = PLAN_LIMITS[plan].bookingsPerMonth;
    if (limit !== null) {
      await lockBusinessRow(tx, businessId);
      const bounds = getMonthBounds(data.startsAt, business.timezone);
      const count = await tx.booking.count({
        where: { startsAt: { gte: bounds.start, lt: bounds.end }, status: { not: "CANCELLED" } },
      });
      if (count >= limit) throw new BookingFailure("PLAN_LIMIT_REACHED");
    }

    const offered = await findOfferedSlot({
      db: tx,
      timezone: business.timezone,
      serviceId: service.id,
      staffId: data.staffId,
      startsAt: data.startsAt,
      now,
    });
    if (!offered) throw new BookingFailure("SLOT_TAKEN", "CHECK");

    const customer = await tx.customer.upsert({
      where: { businessId_email: { businessId, email: data.customer.email } },
      create: {
        businessId,
        name: data.customer.name,
        email: data.customer.email,
        ...(data.customer.phone === undefined ? {} : { phone: data.customer.phone }),
      },
      update: {
        name: data.customer.name,
        ...(data.customer.phone === undefined ? {} : { phone: data.customer.phone }),
      },
      select: { id: true },
    });
    const endsAt = new Date(data.startsAt.getTime() + offered.durationMinutes * 60_000);
    const cancelToken = randomBytes(24).toString("base64url");
    const booking = await tx.booking.create({
      data: {
        businessId,
        serviceId: service.id,
        staffId: offered.staffId,
        customerId: customer.id,
        startsAt: data.startsAt,
        endsAt,
        status: "CONFIRMED",
        cancelToken,
        ...(data.notes === undefined ? {} : { notes: data.notes }),
      },
      select: { id: true, serviceId: true, staffId: true, customerId: true, startsAt: true, endsAt: true },
    });
    return { id: booking.id, cancelToken, serviceId: booking.serviceId, staffId: booking.staffId, customerId: booking.customerId, startsAt: booking.startsAt, endsAt: booking.endsAt, priceCents: service.priceCents };
  }, { maxWait: 10000, timeout: 15000 });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const booking = await runTransaction();
      return { ok: true, booking };
    } catch (error) {
      if (error instanceof BookingFailure) return { ok: false, error: error.code, ...(error.via ? { via: error.via } : {}) };
      if (isExclusionViolation(error)) return { ok: false, error: "SLOT_TAKEN", via: "CONSTRAINT" };
      if (isUniqueViolation(error) && attempt === 0) continue;
      if (isUniqueViolation(error)) throw error;
      throw error;
    }
  }
  throw new Error("Booking transaction retry exhausted unexpectedly.");
}
