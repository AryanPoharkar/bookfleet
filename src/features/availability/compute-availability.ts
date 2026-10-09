import { computeStaffSlots } from "./compute-staff-slots";
import { getLocalDayBounds } from "./local-time";
import { rankStaff } from "./assign-staff";
import type { ServiceTiming, Slot, StaffDay } from "./types";

export function computeAvailability({
  date,
  timezone,
  now,
  service,
  staff,
}: {
  date: string;
  timezone: string;
  now: Date;
  service: ServiceTiming;
  staff: StaffDay[];
}): Slot[] {
  const day = getLocalDayBounds(date, timezone);
  const staffSlots = staff.map((person) => ({
    staffId: person.staffId,
    bookingsOnDay: person.bookings.filter((booking) => booking.startsAt >= day.start && booking.startsAt < day.end).length,
    slots: computeStaffSlots({ date, timezone, now, service, staff: person }),
  }));
  const slotStaff = new Map<number, string[]>();
  for (const person of staffSlots) {
    for (const startsAt of person.slots) {
      const instant = startsAt.getTime();
      const ids = slotStaff.get(instant) ?? [];
      ids.push(person.staffId);
      slotStaff.set(instant, ids);
    }
  }
  const bookingCounts = new Map(staffSlots.map((person) => [person.staffId, person.bookingsOnDay]));
  return [...slotStaff.entries()]
    .sort(([a], [b]) => a - b)
    .map(([instant, ids]) => ({
      startsAt: new Date(instant),
      staffIds: rankStaff(ids.map((staffId) => ({ staffId, bookingsOnDay: bookingCounts.get(staffId) ?? 0 }))),
    }));
}
