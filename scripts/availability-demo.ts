import "dotenv/config";
import { db } from "../src/server/db";
import { getTenantDb } from "../src/server/tenancy/tenant-db";
import { getAvailability } from "../src/features/availability/get-availability";
import { loadAvailabilityData } from "../src/features/availability/load-availability-data";
import { formatMinute } from "../src/features/schedule/time";
import { getLocalDateString } from "../src/features/availability/local-time";
import { TZDate } from "@date-fns/tz";

function localClock(instant: Date, timezone: string): string {
  const local = new TZDate(instant.getTime(), timezone);
  const hour = local.getHours();
  return `${hour % 12 || 12}:${String(local.getMinutes()).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

async function main() {
  const [, , slug, date, staffIdArg] = process.argv;
  if (!slug || !date) {
    throw new Error("Usage: pnpm availability:demo <slug> <YYYY-MM-DD> [staffId]");
  }
  const business = await db.business.findUnique({ where: { slug }, select: { id: true, name: true, timezone: true } });
  if (!business) throw new Error(`Business not found: ${slug}`);
  const tenantDb = getTenantDb(business.id);
  const firstService = await tenantDb.service.findFirst({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  if (!firstService) throw new Error(`No active services found for ${slug}`);
  const data = await loadAvailabilityData({ db: tenantDb, timezone: business.timezone, serviceId: firstService.id, date, staffId: staffIdArg ?? null });
  if (!data) throw new Error(`Service not found: ${firstService.id}`);
  console.log(`Business: ${business.name} (${business.timezone})`);
  console.log(`Service: ${firstService.name} — ${data.service.durationMinutes} min, ${data.service.bufferMinutes} min buffer`);
  for (const person of data.staff) {
    console.log(`\nStaff: ${person.name} (${person.staffId})`);
    console.log(`Hours: ${person.ranges.length ? person.ranges.map((range) => `${formatMinute(range.startMinute)}-${formatMinute(range.endMinute)}`).join(", ") : "No hours"}`);
    console.log("Busy intervals:");
    const busy = [
      ...person.bookings.map((item) => ({ startsAt: item.startsAt, endsAt: new Date(item.endsAt.getTime() + item.bufferMinutes * 60_000), kind: "Booking" })),
      ...person.timeOff.map((item) => ({ ...item, kind: "Time off" })),
    ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    for (const item of busy) {
      console.log(`  ${item.kind}: ${localClock(item.startsAt, business.timezone)}-${localClock(item.endsAt, business.timezone)} | ${item.startsAt.toISOString()} -> ${item.endsAt.toISOString()}`);
    }
    if (busy.length === 0) console.log("  None");
  }
  const availability = await getAvailability({ db: tenantDb, timezone: business.timezone, serviceId: firstService.id, date, staffId: staffIdArg ?? null });
  if (!availability.ok) throw new Error(`Availability failed: ${availability.error}`);
  const nameById = new Map(data.staff.map((person) => [person.staffId, person.name]));
  console.log(`\nSlots for ${getLocalDateString(new Date(`${date}T12:00:00Z`), business.timezone)}:`);
  for (const slot of availability.slots) {
    const names = slot.staffIds.map((id) => nameById.get(id) ?? id).join(", ");
    console.log(`  ${localClock(slot.startsAt, business.timezone)} -> ${names}`);
  }
  console.log(`Slot count: ${availability.slots.length}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect();
});
