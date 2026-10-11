import type { TenantDb } from "@/server/tenancy/types";
import { getLocalDateString, getLocalDayBounds } from "../availability/local-time";
import { getMonthBounds } from "../bookings/month-bounds";
import { addDaysToDateString } from "./dates";
import { bucketByLocalDate, buildChecklist, computeNoShowRate, planUsage, rankTopServices } from "./overview-stats";
import type { BookingScope } from "./scope";

export async function loadOverview({ db, timezone, slug, scope, now }: { db: TenantDb; timezone: string; slug: string; scope: BookingScope; now: Date }) {
  const todayDate = getLocalDateString(now, timezone);
  const dayBounds = getLocalDayBounds(todayDate, timezone);
  const dates = Array.from({ length: 7 }, (_, index) => addDaysToDateString(todayDate, index));
  const rangeStart = getLocalDayBounds(dates[0]!, timezone).start;
  const rangeEnd = getLocalDayBounds(dates[6]!, timezone).end;
  const todayWhere = { status: { not: "CANCELLED" as const }, startsAt: { gte: dayBounds.start, lt: dayBounds.end }, ...(scope.kind === "own" ? { staffId: scope.staffId } : {}) };
  const [today, weekBookings] = await Promise.all([
    db.booking.findMany({ where: todayWhere, orderBy: [{ startsAt: "asc" }, { id: "asc" }], select: { id: true, startsAt: true, status: true, customer: { select: { name: true } }, service: { select: { name: true } }, staff: { select: { name: true } } } }),
    db.booking.findMany({ where: { status: { not: "CANCELLED" }, startsAt: { gte: rangeStart, lt: rangeEnd }, ...(scope.kind === "own" ? { staffId: scope.staffId } : {}) }, select: { startsAt: true } }),
  ]);
  const days = dates.map((date, index) => ({ date, count: bucketByLocalDate(weekBookings.map((row) => row.startsAt), dates, timezone)[index] ?? 0 }));
  if (scope.kind === "own") return { today: today.map((row) => ({ id: row.id, startsAt: row.startsAt, status: row.status, customerName: row.customer.name, serviceName: row.service.name, staffName: row.staff.name })), days, monthUsed: null, topServices: null, noShow: null, checklist: null };
  const month = getMonthBounds(now, timezone);
  const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const [monthUsed, grouped, finished, activeServices, activeStaff, staffLinks, hours, allBookings] = await Promise.all([
    db.booking.count({ where: { startsAt: { gte: month.start, lt: month.end }, status: { not: "CANCELLED" } } }),
    db.booking.groupBy({ by: ["serviceId"], where: { startsAt: { gte: month.start, lt: month.end }, status: { not: "CANCELLED" } }, _count: { _all: true } }),
    db.booking.findMany({ where: { startsAt: { gte: since, lte: now }, status: { in: ["COMPLETED", "NO_SHOW"] } }, select: { status: true } }),
    db.service.count({ where: { isActive: true } }),
    db.staff.findMany({ where: { isActive: true }, select: { id: true } }),
    db.staffService.findMany({ select: { staffId: true } }),
    db.workingHours.findMany({ select: { staffId: true }, distinct: ["staffId"] }),
    db.booking.count(),
  ]);
  const serviceIds = grouped.map((row) => row.serviceId);
  const serviceNames = serviceIds.length ? await db.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(serviceNames.map((service) => [service.id, service.name]));
  const topServices = rankTopServices(grouped.map((row) => ({ serviceId: row.serviceId, count: row._count._all })), names);
  const activeIds = new Set(activeStaff.map((staff) => staff.id));
  const staffWithServices = new Set(staffLinks.filter((link) => activeIds.has(link.staffId)).map((link) => link.staffId)).size;
  const staffWithHours = new Set(hours.filter((item) => activeIds.has(item.staffId)).map((item) => item.staffId)).size;
  return { today: today.map((row) => ({ id: row.id, startsAt: row.startsAt, status: row.status, customerName: row.customer.name, serviceName: row.service.name, staffName: row.staff.name })), days, monthUsed, topServices, noShow: computeNoShowRate(finished.filter((row) => row.status === "COMPLETED").length, finished.filter((row) => row.status === "NO_SHOW").length), checklist: buildChecklist(slug, { activeServices, staffWithServices, staffWithHours, bookings: allBookings }), usage: planUsage("FREE", monthUsed) };
}
