import { getLocalDayBounds, getLocalWeekday } from "./local-time";
import { MAX_BUFFER_MINUTES } from "./config";
import type { getTenantDb } from "../../server/tenancy/tenant-db";
import type { StaffDay } from "./types";

type TenantDb = ReturnType<typeof getTenantDb>;

export async function loadAvailabilityData({
  db,
  timezone,
  serviceId,
  date,
  staffId,
}: {
  db: TenantDb;
  timezone: string;
  serviceId: string;
  date: string;
  staffId: string | null;
}): Promise<{ service: { id: string; durationMinutes: number; bufferMinutes: number }; staff: (StaffDay & { name: string })[] } | null> {
  const [serviceRow, staffLinks] = await Promise.all([
    db.service.findFirst({
      where: { id: serviceId, isActive: true },
      select: { id: true, durationMin: true, bufferMinutes: true },
    }),
    db.staffService.findMany({
      where: { serviceId },
      select: { staffId: true },
    }),
  ]);

  if (!serviceRow) return null;
  const service = {
    id: serviceRow.id,
    durationMinutes: serviceRow.durationMin,
    bufferMinutes: serviceRow.bufferMinutes,
  };
  const linkedStaffIds = [...new Set(staffLinks.map((link) => link.staffId))];
  const staffIds = staffId ? linkedStaffIds.filter((id) => id === staffId) : linkedStaffIds;
  if (staffIds.length === 0) return { service, staff: [] };

  const day = getLocalDayBounds(date, timezone);
  const weekday = getLocalWeekday(date);
  const windowStart = new Date(day.start.getTime() - MAX_BUFFER_MINUTES * 60_000);
  const windowEnd = new Date(day.end.getTime() + MAX_BUFFER_MINUTES * 60_000);
  const [staffRows, workingHoursRows, timeOffRows, bookingRows] = await Promise.all([
    db.staff.findMany({
      where: { id: { in: staffIds, ...(staffId ? { equals: staffId } : {}) }, isActive: true },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    db.workingHours.findMany({
      where: { staffId: { in: staffIds }, weekday },
      select: { staffId: true, startsAt: true, endsAt: true },
    }),
    db.timeOff.findMany({
      where: { staffId: { in: staffIds }, startsAt: { lt: windowEnd }, endsAt: { gt: windowStart } },
      select: { staffId: true, startsAt: true, endsAt: true },
    }),
    db.booking.findMany({
      where: { staffId: { in: staffIds }, status: "CONFIRMED", startsAt: { lt: windowEnd }, endsAt: { gt: windowStart } },
      select: { staffId: true, startsAt: true, endsAt: true, serviceId: true },
    }),
  ]);

  const bookingServiceIds = [...new Set(bookingRows.map((booking) => booking.serviceId))];
  const bookingServices = bookingServiceIds.length > 0
    ? await db.service.findMany({ where: { id: { in: bookingServiceIds } }, select: { id: true, bufferMinutes: true } })
    : [];
  const bufferByServiceId = new Map(bookingServices.map((item) => [item.id, item.bufferMinutes]));
  const hoursByStaff = workingHoursRows.reduce(
    (grouped, row) => {
      const ranges = grouped.get(row.staffId) ?? [];
      ranges.push({
        startMinute: row.startsAt.getUTCHours() * 60 + row.startsAt.getUTCMinutes(),
        endMinute: row.endsAt.getUTCHours() * 60 + row.endsAt.getUTCMinutes(),
      });
      grouped.set(row.staffId, ranges);
      return grouped;
    },
    new Map<string, { startMinute: number; endMinute: number }[]>(),
  );
  const timeOffByStaff = timeOffRows.reduce(
    (grouped, row) => {
      const entries = grouped.get(row.staffId) ?? [];
      entries.push({ startsAt: row.startsAt, endsAt: row.endsAt });
      grouped.set(row.staffId, entries);
      return grouped;
    },
    new Map<string, { startsAt: Date; endsAt: Date }[]>(),
  );
  const bookingsByStaff = bookingRows.reduce(
    (grouped, row) => {
      const entries = grouped.get(row.staffId) ?? [];
      entries.push({
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        bufferMinutes: bufferByServiceId.get(row.serviceId) ?? 0,
      });
      grouped.set(row.staffId, entries);
      return grouped;
    },
    new Map<string, { startsAt: Date; endsAt: Date; bufferMinutes: number }[]>(),
  );

  return {
    service,
    staff: staffRows.map((person) => ({
      staffId: person.id,
      name: person.name,
      ranges: hoursByStaff.get(person.id) ?? [],
      timeOff: timeOffByStaff.get(person.id) ?? [],
      bookings: bookingsByStaff.get(person.id) ?? [],
    })),
  };
}
