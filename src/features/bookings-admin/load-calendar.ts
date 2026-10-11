import type { TenantDb } from "@/server/tenancy/types";
import { BookingStatus } from "@/generated/prisma/client";
import { getLocalDayBounds } from "../availability/local-time";
import type { BookingFilters } from "./filters";
import type { BookingScope } from "./scope";
import { getWeekDates } from "./dates";
import { getLocalDateString } from "../availability/local-time";

export async function loadCalendar({ db, scope, filters, timezone, now }: { db: TenantDb; scope: BookingScope; filters: BookingFilters; timezone: string; now: Date }) {
  const date = filters.date ?? getLocalDateString(now, timezone);
  const dates = filters.view === "week" ? getWeekDates(date) : [date];
  const bounds = dates.map((day) => ({ day, ...getLocalDayBounds(day, timezone) }));
  const bookingWhere = { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW] }, ...(scope.kind === "own" ? { staffId: scope.staffId } : {}), ...(filters.view === "week" && filters.staff && scope.kind === "all" ? { staffId: filters.staff } : {}), OR: bounds.map(({ start, end }) => ({ startsAt: { lt: end }, endsAt: { gt: start } })) };
  const bookingRows = await db.booking.findMany({ where: bookingWhere, orderBy: [{ startsAt: "asc" }, { id: "asc" }], select: { id: true, startsAt: true, endsAt: true, status: true, staffId: true, customerId: true, serviceId: true } });
  const customerIds = [...new Set(bookingRows.map((booking) => booking.customerId))];
  const serviceIds = [...new Set(bookingRows.map((booking) => booking.serviceId))];
  const staffIds = [...new Set(bookingRows.map((booking) => booking.staffId))];
  const [customers, services, bookingStaff, staffRows] = await Promise.all([
    customerIds.length ? db.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    serviceIds.length ? db.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    staffIds.length ? db.staff.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true, isActive: true } }) : Promise.resolve([]),
    db.staff.findMany({ where: scope.kind === "own" ? { id: scope.staffId } : filters.view === "week" && filters.staff ? { id: filters.staff } : { isActive: true }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, isActive: true } }),
  ]);
  const customerById = new Map(customers.map((item) => [item.id, item]));
  const serviceById = new Map(services.map((item) => [item.id, item]));
  const staffById = new Map(bookingStaff.map((item) => [item.id, item]));
  const bookings = bookingRows.map((booking) => ({ ...booking, customer: customerById.get(booking.customerId) ?? { id: booking.customerId, name: "Unknown customer" }, service: serviceById.get(booking.serviceId) ?? { id: booking.serviceId, name: "Unknown service" }, staff: staffById.get(booking.staffId) ?? { id: booking.staffId, name: "Unknown staff", isActive: false } }));
  if (filters.view === "day") {
    const byStaff = new Map(staffRows.map((staff) => [staff.id, staff]));
    for (const booking of bookings) if (!byStaff.has(booking.staffId)) byStaff.set(booking.staffId, booking.staff);
    return { date, dates, columns: [...byStaff.values()].map((staff) => ({ id: staff.id, title: `${staff.name}${staff.isActive ? "" : " (archived)"}`, date, bookings: bookings.filter((booking) => booking.staffId === staff.id) })), bookings };
  }
  if (filters.view === "week") {
    const selectedStaff = scope.kind === "own" ? scope.staffId : (filters.staff ?? staffRows[0]?.id);
    const visible = bookings.filter((booking) => !selectedStaff || booking.staffId === selectedStaff);
    return { date, dates, columns: dates.map((day) => ({ id: day, title: day, date: day, bookings: visible.filter((booking) => { const b = getLocalDayBounds(day, timezone); return booking.startsAt < b.end && booking.endsAt > b.start; }) })), bookings: visible };
  }
  return { date, dates, columns: [], bookings };
}
