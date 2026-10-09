import { getAvailability } from "../availability/get-availability";
import { getLocalDateString } from "../availability/local-time";
import type { AvailabilityDb } from "../availability/types";

export async function findOfferedSlot({
  db,
  timezone,
  serviceId,
  staffId,
  startsAt,
  now,
}: {
  db: AvailabilityDb;
  timezone: string;
  serviceId: string;
  staffId: string | null;
  startsAt: Date;
  now: Date;
}): Promise<{ staffId: string; durationMinutes: number } | null> {
  const date = getLocalDateString(startsAt, timezone);
  const result = await getAvailability({ db, timezone, serviceId, date, staffId, now });
  if (!result.ok) return null;
  const slot = result.slots.find((item) => item.startsAt.getTime() === startsAt.getTime());
  if (!slot) return null;
  const selectedStaffId = staffId ?? slot.staffIds[0];
  if (!selectedStaffId || !slot.staffIds.includes(selectedStaffId)) return null;
  return { staffId: selectedStaffId, durationMinutes: result.service.durationMinutes };
}
