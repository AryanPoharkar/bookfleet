import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/server/db";
import { getTenantDb } from "../src/server/tenancy/tenant-db";
import { cancelBooking } from "../src/features/bookings/cancel-booking";
import { markBooking } from "../src/features/bookings/mark-booking";
import { loadBookingDetail } from "../src/features/bookings-admin/load-booking-detail";
import { loadBookingList } from "../src/features/bookings-admin/load-booking-list";
import { loadOverview } from "../src/features/bookings-admin/load-overview";
import { loadSlotsForDashboard } from "../src/features/bookings-admin/load-slots";
import { parseBookingFilters } from "../src/features/bookings-admin/filters";

const SLUG_A = "vitest-admin-a";
const SLUG_B = "vitest-admin-b";
const now = new Date("2027-01-12T16:00:00.000Z");
const token = (n: number) => String(n).padStart(32, "0");
const instant = (value: string) => new Date(value);

type Fixture = {
  id: string;
  slug: string;
  cutId: string;
  beardId: string;
  annId: string;
  benId: string | null;
  zoeId: string | null;
  miaId: string | null;
  patId: string | null;
  zedId: string | null;
};
let a: Fixture;
let b: Fixture;

async function removeFixture(slug: string) {
  await db.business.deleteMany({ where: { slug } });
}

async function createBusiness(slug: string, plan: "FREE" | "PRO"): Promise<Fixture> {
  const business = await db.business.create({ data: { name: slug, slug, timezone: "America/Chicago", plan }, select: { id: true } });
  const cut = await db.service.create({ data: { businessId: business.id, name: "Test cut", durationMin: 60, bufferMinutes: 0, priceCents: 3500 }, select: { id: true } });
  const beard = await db.service.create({ data: { businessId: business.id, name: "Test beard", durationMin: 30, bufferMinutes: 0, priceCents: 2000 }, select: { id: true } });
  const firstStaff = await db.staff.create({ data: { businessId: business.id, name: plan === "FREE" ? "Ann" : "Zoe", userId: null }, select: { id: true } });
  const secondStaff = plan === "FREE" ? await db.staff.create({ data: { businessId: business.id, name: "Ben", userId: null }, select: { id: true } }) : null;
  const links = [cut.id, beard.id].flatMap((serviceId) => [firstStaff.id, ...(secondStaff ? [secondStaff.id] : [])].map((staffId) => ({ businessId: business.id, staffId, serviceId })));
  await db.staffService.createMany({ data: links });
  await db.workingHours.createMany({ data: Array.from({ length: 7 }, (_, weekday) => ({ businessId: business.id, staffId: firstStaff.id, weekday, startsAt: new Date(Date.UTC(1970, 0, 1, 9)), endsAt: new Date(Date.UTC(1970, 0, 1, 17)) })) });
  return { id: business.id, slug, cutId: cut.id, beardId: beard.id, annId: firstStaff.id, benId: secondStaff?.id ?? null, zoeId: plan === "PRO" ? firstStaff.id : null, miaId: null, patId: null, zedId: null };
}

async function customer(fixture: Fixture, id: string, name: string, email: string) {
  return db.customer.create({ data: { id, businessId: fixture.id, name, email }, select: { id: true } });
}

async function booking(fixture: Fixture, id: string, staffId: string, serviceId: string, customerId: string, start: string, end: string, status: "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED", n: number) {
  return db.booking.create({ data: { id, businessId: fixture.id, staffId, serviceId, customerId, startsAt: instant(start), endsAt: instant(end), status, cancelToken: token(n) } });
}

async function seedRows() {
  const ids = [a.id, b.id];
  await db.booking.deleteMany({ where: { businessId: { in: ids } } });
  await db.customer.deleteMany({ where: { businessId: { in: ids } } });
  const mia = await customer(a, "admin-mia", "Mia Stone", "mia@example.test");
  const pat = await customer(a, "admin-pat", "Pat Lee", "pat@example.test");
  const zed = await customer(b, "admin-zed", "Zed Customer", "zed@example.test");
  a = { ...a, miaId: mia.id, patId: pat.id };
  b = { ...b, zedId: zed.id };
  await booking(a, "b1", a.annId, a.cutId, mia.id, "2027-01-12T16:00:00.000Z", "2027-01-12T17:00:00.000Z", "CONFIRMED", 1);
  await booking(a, "b2", a.annId, a.cutId, pat.id, "2027-01-12T20:00:00.000Z", "2027-01-12T21:00:00.000Z", "CONFIRMED", 2);
  await booking(a, "b3", a.benId!, a.beardId, mia.id, "2027-01-14T16:00:00.000Z", "2027-01-14T16:30:00.000Z", "CONFIRMED", 3);
  await booking(a, "b4", a.annId, a.cutId, mia.id, "2027-01-11T16:00:00.000Z", "2027-01-11T17:00:00.000Z", "COMPLETED", 4);
  await booking(a, "b5", a.benId!, a.beardId, pat.id, "2027-01-10T16:00:00.000Z", "2027-01-10T16:30:00.000Z", "NO_SHOW", 5);
  await booking(a, "b6", a.benId!, a.cutId, pat.id, "2027-01-09T16:00:00.000Z", "2027-01-09T17:00:00.000Z", "CANCELLED", 6);
  await booking(a, "b7", a.annId, a.cutId, mia.id, "2027-02-02T16:00:00.000Z", "2027-02-02T17:00:00.000Z", "CONFIRMED", 7);
  await booking(b, "admin-b1", b.zoeId!, b.cutId, zed.id, "2027-01-12T16:00:00.000Z", "2027-01-12T17:00:00.000Z", "CONFIRMED", 20);
}

beforeAll(async () => {
  await Promise.all([removeFixture(SLUG_A), removeFixture(SLUG_B)]);
  a = await createBusiness(SLUG_A, "FREE");
  b = await createBusiness(SLUG_B, "PRO");
});
afterAll(async () => { await Promise.all([removeFixture(SLUG_A), removeFixture(SLUG_B)]); });
beforeEach(async () => { await seedRows(); });

describe("bookings admin database loaders and actions", () => {
  it("loads overview statistics within the tenant and staff scope", async () => {
    const overview = await loadOverview({ db: getTenantDb(a.id), timezone: "America/Chicago", slug: SLUG_A, scope: { kind: "all" }, now });
    expect(overview.today.map((row) => row.id)).toEqual(["b1", "b2"]);
    expect(overview.days.map((day) => day.count)).toEqual([2, 0, 1, 0, 0, 0, 0]);
    expect(overview.monthUsed).toBe(5);
    expect(overview.topServices?.map((row) => [row.name, row.count])).toEqual([["Test cut", 3], ["Test beard", 2]]);
    expect(overview.noShow).toEqual({ finished: 2, percent: 50 });
    expect(overview.checklist?.doneCount).toBe(4);
    const own = await loadOverview({ db: getTenantDb(a.id), timezone: "America/Chicago", slug: SLUG_A, scope: { kind: "own", staffId: a.annId }, now });
    expect(own.today.map((row) => row.id)).toEqual(["b1", "b2"]);
    expect(own.days.map((day) => day.count)).toEqual([2, 0, 0, 0, 0, 0, 0]);
    expect([own.monthUsed, own.topServices, own.noShow, own.checklist]).toEqual([null, null, null, null]);
    const tenantB = await loadOverview({ db: getTenantDb(b.id), timezone: "America/Chicago", slug: SLUG_B, scope: { kind: "all" }, now });
    expect(tenantB.today).toHaveLength(1);
    expect(JSON.stringify(tenantB.today)).not.toMatch(/Mia|Pat/);
    expect(tenantB.monthUsed).toBe(1);
  });

  it("filters and paginates bookings and prevents cross-tenant or cross-staff detail access", async () => {
    const load = (slug: string, scope: { kind: "all" } | { kind: "own"; staffId: string }, overrides: Record<string, unknown> = {}) => loadBookingList({ db: getTenantDb(slug === SLUG_A ? a.id : b.id), scope, filters: parseBookingFilters({ when: "all", ...overrides }), now });
    expect((await load(SLUG_A, { kind: "all" })).rows.map((row) => row.id)).toEqual(["b7", "b3", "b2", "b1", "b4", "b5", "b6"]);
    expect((await load(SLUG_A, { kind: "all" }, { when: "upcoming" })).rows.map((row) => row.id)).toEqual(["b1", "b2", "b3", "b7"]);
    expect((await load(SLUG_A, { kind: "all" }, { when: "past" })).rows.map((row) => row.id)).toEqual(["b4", "b5", "b6"]);
    expect((await load(SLUG_A, { kind: "all" }, { status: "CANCELLED" })).rows.map((row) => row.id)).toEqual(["b6"]);
    expect((await load(SLUG_A, { kind: "all" }, { q: "PAT@example" })).total).toBe(3);
    expect((await load(SLUG_A, { kind: "all" }, { q: "mia" })).total).toBe(4);
    expect((await load(SLUG_A, { kind: "own", staffId: a.annId }, { staff: a.benId })).rows.map((row) => row.id)).toEqual(["b7", "b2", "b1", "b4"]);
    const first = await loadBookingList({ db: getTenantDb(a.id), scope: { kind: "all" }, filters: parseBookingFilters({ when: "all", page: "1" }), now, pageSize: 3 });
    const third = await loadBookingList({ db: getTenantDb(a.id), scope: { kind: "all" }, filters: parseBookingFilters({ when: "all", page: "3" }), now, pageSize: 3 });
    const beyond = await loadBookingList({ db: getTenantDb(a.id), scope: { kind: "all" }, filters: parseBookingFilters({ when: "all", page: "9" }), now, pageSize: 3 });
    expect(first.rows.map((row) => row.id)).toEqual(["b7", "b3", "b2"]);
    expect(third.rows.map((row) => row.id)).toEqual(["b6"]);
    expect(third.pageInfo.pageCount).toBe(3);
    expect(beyond.pageInfo.page).toBe(3);
    expect((await load(SLUG_B, { kind: "all" })).total).toBe(1);
    expect(await loadBookingDetail({ db: getTenantDb(a.id), scope: { kind: "all" }, id: "b1" })).toMatchObject({ customerName: "Mia Stone", serviceName: "Test cut", staffName: "Ann", status: "CONFIRMED" });
    expect(await loadBookingDetail({ db: getTenantDb(b.id), scope: { kind: "all" }, id: "b1" })).toBeNull();
    expect(await loadBookingDetail({ db: getTenantDb(a.id), scope: { kind: "own", staffId: a.benId! }, id: "b1" })).toBeNull();
    expect(await loadBookingDetail({ db: getTenantDb(a.id), scope: { kind: "own", staffId: a.annId }, id: "b1" })).not.toBeNull();
  });

  it("stores cancellation reasons and enforces mark-booking access and state", async () => {
    expect(await cancelBooking({ db: getTenantDb(a.id), actor: { kind: "member", role: "OWNER", staffId: null }, ref: { bookingId: "b2" }, reason: "Client called", now })).toEqual({ ok: true });
    expect(await db.booking.findUnique({ where: { id: "b2" }, select: { status: true, cancelReason: true } })).toEqual({ status: "CANCELLED", cancelReason: "Client called" });
    expect(await cancelBooking({ db: getTenantDb(a.id), actor: { kind: "member", role: "OWNER", staffId: null }, ref: { bookingId: "b3" }, now })).toEqual({ ok: true });
    expect(await db.booking.findUnique({ where: { id: "b3" }, select: { cancelReason: true } })).toEqual({ cancelReason: null });
    expect(await cancelBooking({ db: getTenantDb(a.id), actor: { kind: "customer" }, ref: { cancelToken: token(7) }, now })).toEqual({ ok: true });
    expect(await db.booking.findUnique({ where: { id: "b7" }, select: { status: true, cancelReason: true } })).toEqual({ status: "CANCELLED", cancelReason: null });
    expect(await markBooking({ db: getTenantDb(a.id), actor: { kind: "member", role: "OWNER", staffId: null }, bookingId: "b1", status: "COMPLETED", now: instant("2027-01-12T15:00:00.000Z") })).toEqual({ ok: false, error: "NOT_STARTED" });
    expect(await db.booking.findUnique({ where: { id: "b1" }, select: { status: true } })).toEqual({ status: "CONFIRMED" });
    expect(await markBooking({ db: getTenantDb(a.id), actor: { kind: "member", role: "OWNER", staffId: null }, bookingId: "b1", status: "COMPLETED", now })).toEqual({ ok: true });
    expect(await markBooking({ db: getTenantDb(a.id), actor: { kind: "member", role: "OWNER", staffId: null }, bookingId: "b1", status: "COMPLETED", now })).toEqual({ ok: false, error: "NOT_CONFIRMED" });
    expect(await markBooking({ db: getTenantDb(a.id), actor: { kind: "member", role: "OWNER", staffId: null }, bookingId: "b6", status: "NO_SHOW", now })).toEqual({ ok: false, error: "NOT_CONFIRMED" });
    await booking(a, "b8", a.annId, a.cutId, a.miaId!, "2027-01-05T16:00:00.000Z", "2027-01-05T17:00:00.000Z", "CONFIRMED", 8);
    expect(await markBooking({ db: getTenantDb(a.id), actor: { kind: "member", role: "STAFF", staffId: a.benId! }, bookingId: "b8", status: "NO_SHOW", now })).toEqual({ ok: false, error: "BOOKING_NOT_FOUND" });
    expect(await db.booking.findUnique({ where: { id: "b8" }, select: { status: true } })).toEqual({ status: "CONFIRMED" });
    expect(await markBooking({ db: getTenantDb(b.id), actor: { kind: "member", role: "OWNER", staffId: null }, bookingId: "b8", status: "NO_SHOW", now })).toEqual({ ok: false, error: "BOOKING_NOT_FOUND" });
    expect(await markBooking({ db: getTenantDb(a.id), actor: { kind: "member", role: "STAFF", staffId: a.annId }, bookingId: "b8", status: "NO_SHOW", now })).toEqual({ ok: true });
  });

  it("loads available slots safely for new and rescheduled bookings", async () => {
    const actor = { kind: "member" as const, role: "OWNER" as const, staffId: null };
    const result = await loadSlotsForDashboard({ db: getTenantDb(a.id), timezone: "America/Chicago", actor, input: { kind: "new", serviceId: a.cutId, staffId: a.annId, date: "2027-01-12" }, now: instant("2027-01-11T12:00:00.000Z") });
    if (!result.ok) throw new Error(`Unexpected slot failure: ${result.error}`);
    expect(result.slots).toContain("2027-01-12T17:00:00.000Z");
    expect(result.slots).toContain("2027-01-12T19:00:00.000Z");
    expect(result.slots).not.toContain("2027-01-12T20:00:00.000Z");
    expect(result.slots).not.toContain("2027-01-12T16:00:00.000Z");
    const moved = await loadSlotsForDashboard({ db: getTenantDb(a.id), timezone: "America/Chicago", actor, input: { kind: "reschedule", bookingId: "b2", date: "2027-01-12" }, now: instant("2027-01-11T12:00:00.000Z") });
    if (!moved.ok) throw new Error(`Unexpected reschedule slot failure: ${moved.error}`);
    expect(moved.slots).toContain("2027-01-12T20:00:00.000Z");
    expect(moved.slots).not.toContain("2027-01-12T16:00:00.000Z");
    expect(await loadSlotsForDashboard({ db: getTenantDb(a.id), timezone: "America/Chicago", actor: { kind: "member", role: "STAFF", staffId: a.benId! }, input: { kind: "reschedule", bookingId: "b2", date: "2027-01-12" }, now: instant("2027-01-11T12:00:00.000Z") })).toEqual({ ok: false, error: "BOOKING_NOT_FOUND" });
    expect(await loadSlotsForDashboard({ db: getTenantDb(a.id), timezone: "America/Chicago", actor, input: { kind: "reschedule", bookingId: "b6", date: "2027-01-12" }, now: instant("2027-01-11T12:00:00.000Z") })).toEqual({ ok: false, error: "NOT_CONFIRMED" });
    expect(await loadSlotsForDashboard({ db: getTenantDb(b.id), timezone: "America/Chicago", actor, input: { kind: "reschedule", bookingId: "b2", date: "2027-01-12" }, now: instant("2027-01-11T12:00:00.000Z") })).toEqual({ ok: false, error: "BOOKING_NOT_FOUND" });
  });
});
