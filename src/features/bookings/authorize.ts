import type { MembershipRole } from "@/generated/prisma/client";
import { can } from "../../server/rbac/permissions";

export type BookingActor =
  | { kind: "member"; role: MembershipRole; staffId: string | null }
  | { kind: "customer" };

export function checkBookingAccess(
  actor: BookingActor,
  booking: { staffId: string; startsAt: Date },
  now: Date,
): "OK" | "BOOKING_NOT_FOUND" | "ALREADY_STARTED" {
  if (actor.kind === "customer") {
    return booking.startsAt.getTime() > now.getTime() ? "OK" : "ALREADY_STARTED";
  }
  if (can(actor.role, "booking:cancel_all")) return "OK";
  if (can(actor.role, "booking:cancel_own") && actor.staffId !== null && actor.staffId === booking.staffId) return "OK";
  return "BOOKING_NOT_FOUND";
}
