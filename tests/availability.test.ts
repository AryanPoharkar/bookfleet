import { describe, expect, it } from "vitest";
import { TZDate } from "@date-fns/tz";
import { computeStaffSlots } from "../src/features/availability/compute-staff-slots";
import { computeAvailability } from "../src/features/availability/compute-availability";
import { rankStaff } from "../src/features/availability/assign-staff";
import { getBookableDateRange, getLocalDateString, localMinuteToUtc } from "../src/features/availability/local-time";
import type { ServiceTiming, StaffDay } from "../src/features/availability/types";

const timezone = "America/Chicago";
const date = "2027-01-12";
const now = new Date("2027-01-11T12:00:00Z");
const service: ServiceTiming = { durationMinutes: 60, bufferMinutes: 0 };
const baseStaff = (): StaffDay => ({ staffId: "A", ranges: [{ startMinute: 540, endMinute: 1020 }], timeOff: [], bookings: [] });
const at = (time: string, day = date) => localMinuteToUtc(day, Number(time.slice(0, 2)) * 60 + Number(time.slice(3)), timezone);
const slots = (person: StaffDay, overrides: Partial<{ date: string; now: Date; service: ServiceTiming }> = {}) => computeStaffSlots({ date: overrides.date ?? date, timezone, now: overrides.now ?? now, service: overrides.service ?? service, staff: person });
const localTimes = (items: Date[], day = date) => items
  .map((item) => {
    const local = new TZDate(item.getTime(), timezone);
    return { date: getLocalDateString(item, timezone), time: `${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}` };
  })
  .filter((item) => item.date === day)
  .map((item) => item.time);

describe("availability engine", () => {
  it("returns 29 slots on a normal day", () => {
    const result = slots(baseStaff());
    expect(result).toHaveLength(29);
    expect(localTimes(result)[0]).toBe("09:00");
    expect(localTimes(result).at(-1)).toBe("16:00");
  });

  it("handles split shifts without crossing the gap", () => {
    const person = baseStaff();
    person.ranges = [{ startMinute: 540, endMinute: 720 }, { startMinute: 780, endMinute: 1020 }];
    const times = localTimes(slots(person));
    expect(times).toHaveLength(22);
    expect(times).toContain("11:00");
    expect(times).toContain("13:00");
    expect(times).not.toContain("11:15");
    expect(times).not.toContain("12:45");
  });

  it("allows back-to-back bookings but blocks overlaps", () => {
    const person = baseStaff();
    person.bookings = [{ startsAt: at("10:00"), endsAt: at("11:00"), bufferMinutes: 0 }];
    const times = localTimes(slots(person));
    expect(times).toHaveLength(22);
    expect(times).toContain("09:00");
    expect(times).toContain("11:00");
    expect(times).not.toContain("09:15");
    expect(times).not.toContain("10:45");
  });

  it("respects service and existing-booking buffers", () => {
    const person = baseStaff();
    person.bookings = [{ startsAt: at("12:00"), endsAt: at("13:00"), bufferMinutes: 15 }];
    const times = localTimes(slots(person, { service: { durationMinutes: 60, bufferMinutes: 15 } }));
    expect(times).toHaveLength(20);
    expect(times).toContain("10:45");
    expect(times).toContain("13:15");
    expect(times).toContain("16:00");
    expect(times).not.toContain("11:00");
    expect(times).not.toContain("13:00");
  });

  it("blocks time off using half-open intervals", () => {
    const person = baseStaff();
    person.timeOff = [{ startsAt: at("12:00"), endsAt: at("14:00") }];
    const times = localTimes(slots(person));
    expect(times).toHaveLength(18);
    expect(times).toContain("11:00");
    expect(times).toContain("14:00");
    expect(times).not.toContain("11:15");
    expect(times).not.toContain("13:45");
  });

  it("returns no slots for a past date", () => {
    expect(slots(baseStaff(), { date: "2027-01-10" })).toHaveLength(0);
  });

  it("enforces the exact minimum-notice boundary", () => {
    const first = slots(baseStaff(), { now: new Date("2027-01-12T16:00:00Z") });
    expect(first).toHaveLength(17);
    expect(localTimes(first)[0]).toBe("12:00");
    expect(localTimes(first)).not.toContain("11:45");
    const second = slots(baseStaff(), { now: new Date("2027-01-12T16:07:00Z") });
    expect(second).toHaveLength(16);
    expect(localTimes(second)[0]).toBe("12:15");
  });

  it("limits booking dates to 60 calendar days ahead", () => {
    expect(getBookableDateRange(now, timezone)).toEqual({ firstDate: "2027-01-11", lastDate: "2027-03-12" });
    expect(slots(baseStaff(), { date: "2027-03-12" })).toHaveLength(29);
    expect(slots(baseStaff(), { date: "2027-03-13" })).toHaveLength(0);
  });

  it("handles the spring-forward gap with elapsed-time stepping", () => {
    const person = baseStaff();
    person.ranges = [{ startMinute: 0, endMinute: 360 }];
    const result = slots(person, { date: "2027-03-14", now: new Date("2027-03-10T12:00:00Z") });
    const times = localTimes(result, "2027-03-14");
    expect(result).toHaveLength(17);
    expect(times.some((time) => time.startsWith("02:"))).toBe(false);
    expect(times[0]).toBe("00:00");
    expect(times.at(-1)).toBe("05:00");
  });

  it("handles the fall-back repeated hour", () => {
    const person = baseStaff();
    person.ranges = [{ startMinute: 0, endMinute: 360 }];
    const result = slots(person, { date: "2027-11-07", now: new Date("2027-11-03T12:00:00Z") });
    const times = localTimes(result, "2027-11-07");
    expect(result).toHaveLength(25);
    expect(times.filter((time) => time.startsWith("01:")).length).toBe(8);
    expect(times[0]).toBe("00:00");
    expect(times.at(-1)).toBe("05:00");
  });

  it("merges staff slots and ranks staff with fewer bookings first", () => {
    const a = baseStaff();
    a.bookings = ["09:00", "10:00", "11:00"].map((time) => ({ startsAt: at(time), endsAt: at(`${String(Number(time.slice(0, 2)) + 1).padStart(2, "0")}:00`), bufferMinutes: 0 }));
    const b: StaffDay = { ...baseStaff(), staffId: "B", bookings: [{ startsAt: at("14:00"), endsAt: at("15:00"), bufferMinutes: 0 }] };
    const c: StaffDay = { ...baseStaff(), staffId: "C", bookings: [{ startsAt: at("13:00"), endsAt: at("14:00"), bufferMinutes: 0 }] };
    const result = computeAvailability({ date, timezone, now, service, staff: [a, b, c] });
    const atTime = (time: string) => result.find((slot) => slot.startsAt.getTime() === at(time).getTime())?.staffIds;
    expect(result).toHaveLength(29);
    expect(atTime("12:00")).toEqual(["B", "C", "A"]);
    expect(atTime("09:00")).toEqual(["B", "C"]);
    expect(atTime("14:00")).toEqual(["C", "A"]);
    expect(atTime("13:00")).toEqual(["B", "A"]);
    expect(atTime("13:15")).toEqual(["A"]);
    expect(rankStaff([{ staffId: "a", bookingsOnDay: 3 }, { staffId: "b", bookingsOnDay: 1 }, { staffId: "c", bookingsOnDay: 1 }])).toEqual(["b", "c", "a"]);
  });

  it("returns no slots when staff, hours, bookings, or full-day time off leave no availability", () => {
    expect(computeAvailability({ date, timezone, now, service, staff: [] })).toEqual([]);
    const noHours = baseStaff();
    noHours.ranges = [];
    expect(slots(noHours)).toHaveLength(0);
    const booked = baseStaff();
    booked.bookings = [{ startsAt: at("09:00"), endsAt: at("17:00"), bufferMinutes: 0 }];
    expect(slots(booked)).toHaveLength(0);
    const off = baseStaff();
    off.timeOff = [{ startsAt: localMinuteToUtc(date, 0, timezone), endsAt: localMinuteToUtc(date, 1440, timezone) }];
    expect(slots(off)).toHaveLength(0);
  });
});
