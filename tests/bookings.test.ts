import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { TZDate } from "@date-fns/tz";
import { db } from "../src/server/db";
import { getTenantDb } from "../src/server/tenancy/tenant-db";
import { createBooking } from "../src/features/bookings/create-booking";
import { cancelBooking } from "../src/features/bookings/cancel-booking";
import { rescheduleBooking } from "../src/features/bookings/reschedule-booking";
import { isExclusionViolation } from "../src/features/bookings/db-errors";

const now = new Date("2027-01-11T12:00:00.000Z");
const at = (hour: number, minute = 0) => new TZDate(2027, 0, 12, hour, minute, "America/Chicago");
const atDate = (year: number, month: number, day: number, hour: number, minute = 0) => new TZDate(year, month - 1, day, hour, minute, "America/Chicago");
const token = () => randomBytes(24).toString("base64url");

type Fixture = { id: string; slug: string; serviceId: string; annId: string; benId: string };
let businessA: Fixture;
let businessB: Fixture;
let businessFree: Fixture;

async function removeFixture(slug: string) {
  await db.business.deleteMany({ where: { slug } });
}

async function createFixture(slug: string, plan: "PRO" | "FREE"): Promise<Fixture> {
  const business = await db.business.create({ data: { name: slug, slug, timezone: "America/Chicago", plan }, select: { id: true, slug: true } });
  const service = await db.service.create({ data: { businessId: business.id, name: "Test cut", durationMin: 60, bufferMinutes: 0, priceCents: 3500 }, select: { id: true } });
  const ann = await db.staff.create({ data: { businessId: business.id, name: "Ann", userId: null }, select: { id: true } });
  const ben = await db.staff.create({ data: { businessId: business.id, name: "Ben", userId: null }, select: { id: true } });
  await db.staffService.createMany({ data: [{ businessId: business.id, staffId: ann.id, serviceId: service.id }, { businessId: business.id, staffId: ben.id, serviceId: service.id }] });
  const hours = [ann.id, ben.id].flatMap((staffId) => Array.from({ length: 7 }, (_, weekday) => ({
    businessId: business.id,
    staffId,
    weekday,
    startsAt: new Date(Date.UTC(1970, 0, 1, 9, 0)),
    endsAt: new Date(Date.UTC(1970, 0, 1, 17, 0)),
  })));
  await db.workingHours.createMany({ data: hours });
  return { id: business.id, slug, serviceId: service.id, annId: ann.id, benId: ben.id };
}

async function rawBooking(fixture: Fixture, staffId: string, startsAt: Date, status: "CONFIRMED" | "CANCELLED" = "CONFIRMED") {
  const customer = await db.customer.create({ data: { businessId: fixture.id, name: "Fixture Customer", email: `${randomBytes(12).toString("hex")}@example.test` }, select: { id: true } });
  return db.booking.create({ data: {
    businessId: fixture.id,
    serviceId: fixture.serviceId,
    staffId,
    customerId: customer.id,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 60 * 60_000),
    status,
    cancelToken: token(),
  } });
}

async function rawLimitRows(fixture: Fixture, count: number) {
  const customers = await Promise.all(Array.from({ length: count }, (_, index) => db.customer.create({
    data: { businessId: fixture.id, name: `Limit ${index}`, email: `${randomBytes(12).toString("hex")}@example.test` },
    select: { id: true },
  })));
  await db.booking.createMany({ data: customers.map((customer, index) => {
    const startsAt = new Date(Date.UTC(2027, 0, 18, index, 0));
    return { businessId: fixture.id, serviceId: fixture.serviceId, staffId: fixture.annId, customerId: customer.id, startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000), status: "CONFIRMED" as const, cancelToken: token() };
  }) });
}

async function create(fixture: Fixture, staffId: string | null, startsAt: Date, email = `${randomBytes(12).toString("hex")}@example.test`, name = "Test Person") {
  return createBooking({ businessId: fixture.id, input: { serviceId: fixture.serviceId, staffId, startsAt: new Date(startsAt.getTime()).toISOString(), customer: { name, email } }, now });
}

beforeAll(async () => {
  await Promise.all(["vitest-book-a", "vitest-book-b", "vitest-book-free"].map(removeFixture));
  businessA = await createFixture("vitest-book-a", "PRO");
  businessB = await createFixture("vitest-book-b", "PRO");
  businessFree = await createFixture("vitest-book-free", "FREE");
});

afterAll(async () => {
  await Promise.all(["vitest-book-a", "vitest-book-b", "vitest-book-free"].map(removeFixture));
});

beforeEach(async () => {
  const ids = [businessA.id, businessB.id, businessFree.id];
  await db.booking.deleteMany({ where: { businessId: { in: ids } } });
  await db.customer.deleteMany({ where: { businessId: { in: ids } } });
});

describe("booking persistence and concurrency", () => {
  it("creates bookings and upserts customers by business and normalized email", async () => {
    const first = await create(businessA, businessA.annId, at(10), "Mia@Example.test", "  Mia Stone ");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.booking.endsAt.getTime()).toBe(at(11).getTime());
    expect(first.booking.priceCents).toBe(3500);
    expect(first.booking.cancelToken).toHaveLength(32);
    expect(await db.booking.count({ where: { id: first.booking.id, businessId: businessA.id, status: "CONFIRMED" } })).toBe(1);
    const second = await create(businessA, businessA.annId, at(12), "MIA@example.test", "Mia S.");
    expect(second.ok).toBe(true);
    expect(await db.customer.count({ where: { businessId: businessA.id, email: "mia@example.test" } })).toBe(1);
    expect(await db.customer.findFirst({ where: { businessId: businessA.id, email: "mia@example.test" } }).then((row) => row?.name)).toBe("Mia S.");
    const parallel = await Promise.all([create(businessA, businessA.annId, at(13), "Pat@Example.test"), create(businessA, businessA.annId, at(14), "Pat@Example.test")]);
    expect(parallel.every((result) => result.ok)).toBe(true);
    expect(await db.customer.count({ where: { businessId: businessA.id, email: "pat@example.test" } })).toBe(1);
  });

  it("does not allow cross-tenant service and staff identifiers", async () => {
    const result = await createBooking({ businessId: businessA.id, input: { serviceId: businessB.serviceId, staffId: businessB.annId, startsAt: new Date(at(10).getTime()).toISOString(), customer: { name: "Test Person", email: "cross@example.test" } }, now });
    expect(result).toEqual({ ok: false, error: "SERVICE_NOT_FOUND" });
    expect(await db.booking.count({ where: { businessId: { in: [businessA.id, businessB.id] } } })).toBe(0);
  });

  it("blocks overlapping bookings for one staff member but allows another staff member", async () => {
    expect((await create(businessA, businessA.annId, at(10))).ok).toBe(true);
    expect(await create(businessA, businessA.annId, at(10, 30))).toMatchObject({ ok: false, error: "SLOT_TAKEN" });
    expect(await create(businessA, businessA.annId, at(9, 15))).toMatchObject({ ok: false, error: "SLOT_TAKEN" });
    expect((await create(businessA, businessA.benId, at(10, 30))).ok).toBe(true);
  });

  it("allows exact back-to-back bookings", async () => {
    expect((await create(businessA, businessA.annId, at(10))).ok).toBe(true);
    expect((await create(businessA, businessA.annId, at(11))).ok).toBe(true);
    expect((await create(businessA, businessA.annId, at(9))).ok).toBe(true);
  });

  it("allows only one of twenty simultaneous requests for the same slot", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, (_, index) => create(businessA, businessA.annId, at(10), `parallel-${index}@example.test`)));
    const successes = results.filter((result) => result.ok).length;
    const taken = results.filter((result) => !result.ok && result.error === "SLOT_TAKEN");
    const constraintCount = taken.filter((result) => !result.ok && result.via === "CONSTRAINT").length;
    const checkCount = taken.filter((result) => !result.ok && result.via === "CHECK").length;
    console.log(`Concurrent booking outcomes: ${successes} ok, ${taken.length} SLOT_TAKEN; via CONSTRAINT=${constraintCount}, via CHECK=${checkCount}`);
    expect(successes).toBe(1);
    expect(taken).toHaveLength(19);
    expect(await db.booking.count({ where: { businessId: businessA.id, staffId: businessA.annId, status: "CONFIRMED", startsAt: at(10) } })).toBe(1);
  });

  it("enforces the database exclusion constraint for confirmed rows only", async () => {
    await rawBooking(businessA, businessA.annId, at(10));
    let caught: unknown;
    try {
      await rawBooking(businessA, businessA.annId, at(10));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    expect(isExclusionViolation(caught)).toBe(true);
    await expect(rawBooking(businessA, businessA.annId, at(10), "CANCELLED")).resolves.toBeDefined();
  });

  it("enforces the FREE monthly limit and counts cancelled rows as available capacity", async () => {
    await rawLimitRows(businessFree, 50);
    expect(await create(businessFree, businessFree.annId, at(10))).toMatchObject({ ok: false, error: "PLAN_LIMIT_REACHED" });
    expect((await create(businessFree, businessFree.annId, atDate(2027, 2, 2, 10))).ok).toBe(true);
    const one = await db.booking.findFirst({ where: { businessId: businessFree.id, status: "CONFIRMED" }, orderBy: { startsAt: "asc" }, select: { id: true } });
    if (!one) throw new Error("Expected a fixture booking");
    await db.booking.update({ where: { id: one.id }, data: { status: "CANCELLED" } });
    expect((await create(businessFree, businessFree.annId, at(10))).ok).toBe(true);
    expect(await create(businessFree, businessFree.annId, at(12))).toMatchObject({ ok: false, error: "PLAN_LIMIT_REACHED" });
  });

  it("serializes concurrent FREE plan limit checks", async () => {
    await rawLimitRows(businessFree, 49);
    const results = await Promise.all([9, 10, 11, 12, 13].map((hour) => create(businessFree, businessFree.annId, at(hour))));
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.error === "PLAN_LIMIT_REACHED")).toHaveLength(4);
  });

  it("cancels bookings only when actor access and status permit it", async () => {
    const created = await create(businessA, businessA.annId, at(10));
    if (!created.ok) throw new Error("Booking setup failed");
    expect(await cancelBooking({ db: getTenantDb(businessA.id), actor: { kind: "member", role: "STAFF", staffId: businessA.benId }, ref: { bookingId: created.booking.id }, now })).toEqual({ ok: false, error: "BOOKING_NOT_FOUND" });
    expect(await db.booking.findUnique({ where: { id: created.booking.id } }).then((row) => row?.status)).toBe("CONFIRMED");
    expect(await cancelBooking({ db: getTenantDb(businessA.id), actor: { kind: "member", role: "STAFF", staffId: businessA.annId }, ref: { bookingId: created.booking.id }, now })).toEqual({ ok: true });
    expect(await cancelBooking({ db: getTenantDb(businessA.id), actor: { kind: "member", role: "OWNER", staffId: null }, ref: { bookingId: created.booking.id }, now })).toEqual({ ok: false, error: "NOT_CONFIRMED" });
    const second = await create(businessA, businessA.annId, at(12));
    if (!second.ok) throw new Error("Second booking setup failed");
    expect(await cancelBooking({ db: getTenantDb(businessA.id), actor: { kind: "customer" }, ref: { cancelToken: second.booking.cancelToken }, now })).toEqual({ ok: true });
    expect(await cancelBooking({ db: getTenantDb(businessA.id), actor: { kind: "customer" }, ref: { cancelToken: "A".repeat(32) }, now })).toEqual({ ok: false, error: "BOOKING_NOT_FOUND" });
    expect(await cancelBooking({ db: getTenantDb(businessA.id), actor: { kind: "customer" }, ref: { bookingId: second.booking.id }, now })).toEqual({ ok: false, error: "BOOKING_NOT_FOUND" });
    const third = await create(businessA, businessA.annId, at(14));
    if (!third.ok) throw new Error("Third booking setup failed");
    expect(await cancelBooking({ db: getTenantDb(businessA.id), actor: { kind: "member", role: "MANAGER", staffId: null }, ref: { bookingId: third.booking.id }, now })).toEqual({ ok: true });
    const started = await rawBooking(businessA, businessA.annId, new Date("2027-01-11T11:00:00Z"));
    expect(await cancelBooking({ db: getTenantDb(businessA.id), actor: { kind: "customer" }, ref: { cancelToken: started.cancelToken }, now })).toEqual({ ok: false, error: "ALREADY_STARTED" });
    expect(await cancelBooking({ db: getTenantDb(businessA.id), actor: { kind: "member", role: "OWNER", staffId: null }, ref: { bookingId: started.id }, now })).toEqual({ ok: true });
    expect(await cancelBooking({ db: getTenantDb(businessB.id), actor: { kind: "member", role: "OWNER", staffId: null }, ref: { bookingId: started.id }, now })).toEqual({ ok: false, error: "BOOKING_NOT_FOUND" });
    expect((await create(businessA, businessA.annId, at(10))).ok).toBe(true);
  });

  it("reschedules in place and rolls back when the new slot is unavailable", async () => {
    const first = await create(businessA, businessA.annId, at(10));
    if (!first.ok) throw new Error("Booking setup failed");
    const moved = await rescheduleBooking({ businessId: businessA.id, actor: { kind: "customer" }, ref: { cancelToken: first.booking.cancelToken }, newStartsAt: at(10, 15), now });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.booking.id).toBe(first.booking.id);
    expect(moved.booking.cancelToken).toBe(first.booking.cancelToken);
    expect(moved.booking.endsAt.getTime()).toBe(at(11, 15).getTime());
    expect(moved.booking.status).toBe("CONFIRMED");

    const busy = await create(businessA, businessA.annId, at(14));
    if (!busy.ok) throw new Error("Second booking setup failed");
    const original = await db.booking.findUnique({ where: { id: first.booking.id }, select: { startsAt: true, endsAt: true, status: true } });
    expect(await rescheduleBooking({ businessId: businessA.id, actor: { kind: "customer" }, ref: { cancelToken: first.booking.cancelToken }, newStartsAt: at(14, 30), now })).toMatchObject({ ok: false, error: "SLOT_TAKEN" });
    expect(await rescheduleBooking({ businessId: businessA.id, actor: { kind: "customer" }, ref: { cancelToken: first.booking.cancelToken }, newStartsAt: at(8), now })).toMatchObject({ ok: false, error: "SLOT_TAKEN" });
    expect(await db.booking.findUnique({ where: { id: first.booking.id }, select: { startsAt: true, endsAt: true, status: true } })).toEqual(original);
    await db.booking.update({ where: { id: busy.booking.id }, data: { status: "CANCELLED" } });
    expect(await rescheduleBooking({ businessId: businessA.id, actor: { kind: "customer" }, ref: { cancelToken: busy.booking.cancelToken }, newStartsAt: at(15), now })).toMatchObject({ ok: false, error: "NOT_CONFIRMED" });
    expect(await rescheduleBooking({ businessId: businessA.id, actor: { kind: "member", role: "STAFF", staffId: businessA.benId }, ref: { bookingId: first.booking.id }, newStartsAt: at(12), now })).toMatchObject({ ok: false, error: "BOOKING_NOT_FOUND" });
    const started = await rawBooking(businessA, businessA.annId, new Date("2027-01-11T11:00:00Z"));
    expect(await rescheduleBooking({ businessId: businessA.id, actor: { kind: "customer" }, ref: { cancelToken: started.cancelToken }, newStartsAt: at(15), now })).toMatchObject({ ok: false, error: "ALREADY_STARTED" });
  });
});
