import { computeAvailability } from "./compute-availability";
import { isValidDateString } from "./local-time";
import { loadAvailabilityData } from "./load-availability-data";
import type { AvailabilityDb, Slot } from "./types";

export async function getAvailability({
  db,
  timezone,
  serviceId,
  date,
  staffId,
  now = new Date(),
}: {
  db: AvailabilityDb;
  timezone: string;
  serviceId: string;
  date: string;
  staffId: string | null;
  now?: Date;
}): Promise<
  | { ok: true; date: string; timezone: string; service: { id: string; durationMinutes: number; bufferMinutes: number }; slots: Slot[] }
  | { ok: false; error: "INVALID_DATE" | "SERVICE_NOT_FOUND" }
> {
  if (!isValidDateString(date)) return { ok: false, error: "INVALID_DATE" };
  const data = await loadAvailabilityData({ db, timezone, serviceId, date, staffId });
  if (!data) return { ok: false, error: "SERVICE_NOT_FOUND" };
  const slots = computeAvailability({ date, timezone, now, service: data.service, staff: data.staff });
  return { ok: true, date, timezone, service: data.service, slots };
}
