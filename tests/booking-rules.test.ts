import { describe, expect, it } from "vitest";
import { getMonthBounds } from "../src/features/bookings/month-bounds";
import { isExclusionViolation, isUniqueViolation } from "../src/features/bookings/db-errors";
import { checkBookingAccess } from "../src/features/bookings/authorize";
import { createBookingSchema } from "../src/features/bookings/schemas";
import { PLAN_LIMITS } from "../src/config/plans";

const instant = (value: string) => new Date(value);

describe("booking rules", () => {
  it("calculates local calendar month bounds across time zones and DST", () => {
    expect(getMonthBounds(instant("2027-01-12T16:00:00Z"), "America/Chicago")).toEqual({ start: instant("2027-01-01T06:00:00Z"), end: instant("2027-02-01T06:00:00Z") });
    expect(getMonthBounds(instant("2027-03-20T12:00:00Z"), "America/Chicago")).toEqual({ start: instant("2027-03-01T06:00:00Z"), end: instant("2027-04-01T05:00:00Z") });
    expect(getMonthBounds(instant("2027-02-01T05:59:00Z"), "America/Chicago")).toEqual({ start: instant("2027-01-01T06:00:00Z"), end: instant("2027-02-01T06:00:00Z") });
    expect(getMonthBounds(instant("2027-06-15T12:00:00Z"), "Europe/London")).toEqual({ start: instant("2027-05-31T23:00:00Z"), end: instant("2027-06-30T23:00:00Z") });
  });

  it("recognizes PostgreSQL exclusion and unique violations through error wrappers", () => {
    expect(isExclusionViolation({ code: "23P01" })).toBe(true);
    expect(isExclusionViolation({ meta: { code: "23P01" } })).toBe(true);
    expect(isExclusionViolation({ cause: { code: "23P01" } })).toBe(true);
    expect(isExclusionViolation(new Error("booking_no_overlap"))).toBe(true);
    expect(isExclusionViolation(new Error("x"))).toBe(false);
    expect(isExclusionViolation(null)).toBe(false);
    expect(isExclusionViolation({ code: "P2002" })).toBe(false);
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
  });

  it("applies member and customer booking access rules", () => {
    const now = instant("2027-01-12T16:00:00Z");
    const future = instant("2027-01-12T17:00:00Z");
    const past = instant("2027-01-12T15:00:00Z");
    expect(checkBookingAccess({ kind: "member", role: "OWNER", staffId: null }, { staffId: "ann", startsAt: past }, now)).toBe("OK");
    expect(checkBookingAccess({ kind: "member", role: "MANAGER", staffId: null }, { staffId: "ann", startsAt: future }, now)).toBe("OK");
    expect(checkBookingAccess({ kind: "member", role: "STAFF", staffId: "ann" }, { staffId: "ann", startsAt: future }, now)).toBe("OK");
    expect(checkBookingAccess({ kind: "member", role: "STAFF", staffId: "ben" }, { staffId: "ann", startsAt: future }, now)).toBe("BOOKING_NOT_FOUND");
    expect(checkBookingAccess({ kind: "member", role: "STAFF", staffId: null }, { staffId: "ann", startsAt: future }, now)).toBe("BOOKING_NOT_FOUND");
    expect(checkBookingAccess({ kind: "customer" }, { staffId: "ann", startsAt: future }, now)).toBe("OK");
    expect(checkBookingAccess({ kind: "customer" }, { staffId: "ann", startsAt: now }, now)).toBe("ALREADY_STARTED");
  });

  it("validates booking inputs and plan limits", () => {
    const valid = createBookingSchema.parse({ serviceId: "service-1", staffId: null, startsAt: "2027-01-12T16:00:00Z", customer: { name: " Mia Stone ", email: "MIA@Example.test", phone: "" }, notes: " First visit " });
    expect(valid.customer.email).toBe("mia@example.test");
    expect(valid.customer.phone).toBeUndefined();
    expect(valid.customer.name).toBe("Mia Stone");
    expect(valid.staffId).toBeNull();
    const base = { serviceId: "service-1", staffId: null, startsAt: "2027-01-12T16:00:00Z", customer: { name: "Mia Stone", email: "mia@example.test" } };
    expect(createBookingSchema.safeParse({ ...base, staffId: "" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, startsAt: "2027-01-12T10:00:00-06:00" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, customer: { name: "Mia Stone", email: "a@" } }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, customer: { name: "A", email: "mia@example.test" } }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, customer: { name: "Mia Stone", email: "mia@example.test", phone: "abc" } }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, notes: "x".repeat(501) }).success).toBe(false);
    expect(PLAN_LIMITS.FREE.bookingsPerMonth).toBe(50);
    expect(PLAN_LIMITS.PRO.bookingsPerMonth).toBeNull();
    expect(PLAN_LIMITS.BUSINESS.bookingsPerMonth).toBeNull();
  });
});
