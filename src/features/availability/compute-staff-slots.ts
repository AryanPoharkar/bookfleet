import { MIN_NOTICE_MINUTES, SLOT_STEP_MINUTES } from "./config";
import { getBookableDateRange, localMinuteToUtc } from "./local-time";
import type { ServiceTiming, StaffDay } from "./types";

export function computeStaffSlots({
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
  staff: StaffDay;
}): Date[] {
  // Booking.endsAt is startsAt + service duration, without buffer; only CONFIRMED bookings are passed in.
  const range = getBookableDateRange(now, timezone);
  if (date < range.firstDate || date > range.lastDate) return [];

  const noticeBoundary = now.getTime() + MIN_NOTICE_MINUTES * 60_000;
  const candidates = new Map<number, Date>();

  for (const rangeItem of staff.ranges) {
    const rangeStart = localMinuteToUtc(date, rangeItem.startMinute, timezone).getTime();
    const rangeEnd = localMinuteToUtc(date, rangeItem.endMinute, timezone).getTime();
    for (let startMs = rangeStart; startMs + service.durationMinutes * 60_000 <= rangeEnd; startMs += SLOT_STEP_MINUTES * 60_000) {
      if (startMs < noticeBoundary) continue;
      const blockEnd = startMs + (service.durationMinutes + service.bufferMinutes) * 60_000;
      const overlapsTimeOff = staff.timeOff.some((item) => startMs < item.endsAt.getTime() && blockEnd > item.startsAt.getTime());
      if (overlapsTimeOff) continue;
      const overlapsBooking = staff.bookings.some((booking) => {
        const bookingBlockEnd = booking.endsAt.getTime() + booking.bufferMinutes * 60_000;
        return startMs < bookingBlockEnd && blockEnd > booking.startsAt.getTime();
      });
      if (!overlapsBooking) candidates.set(startMs, new Date(startMs));
    }
  }

  return [...candidates.values()].sort((a, b) => a.getTime() - b.getTime());
}
