import { TZDate } from "@date-fns/tz";
import { MAX_ADVANCE_DAYS } from "./config";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateParts(value: string): [number, number, number] | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) return null;
  return [year, month, day];
}

export function isValidDateString(value: string): boolean {
  return parseDateParts(value) !== null;
}

export function getLocalWeekday(date: string): number {
  const parts = parseDateParts(date);
  if (!parts) throw new RangeError("Invalid local date string.");
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
}

function addCalendarDays(date: string, days: number): string {
  const parts = parseDateParts(date);
  if (!parts) throw new RangeError("Invalid local date string.");
  const value = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

export function localMinuteToUtc(date: string, minute: number, timezone: string): Date {
  const parts = parseDateParts(date);
  if (!parts || !Number.isFinite(minute)) throw new RangeError("Invalid local date or minute.");
  const dayOffset = Math.floor(minute / 1440);
  const minuteOfDay = ((minute % 1440) + 1440) % 1440;
  const targetDate = addCalendarDays(date, dayOffset);
  const targetParts = parseDateParts(targetDate);
  if (!targetParts) throw new RangeError("Invalid local date string.");
  const hour = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  // TZDate normalizes wall-clock times inside a spring-forward gap forward to a valid time after the gap.
  return new TZDate(targetParts[0], targetParts[1] - 1, targetParts[2], hour, minutes, timezone);
}

export function getLocalDayBounds(date: string, timezone: string): { start: Date; end: Date } {
  return {
    start: localMinuteToUtc(date, 0, timezone),
    end: localMinuteToUtc(date, 1440, timezone),
  };
}

export function getLocalDateString(instant: Date, timezone: string): string {
  const local = new TZDate(instant.getTime(), timezone);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

export function getBookableDateRange(now: Date, timezone: string): { firstDate: string; lastDate: string } {
  const firstDate = getLocalDateString(now, timezone);
  return { firstDate, lastDate: addCalendarDays(firstDate, MAX_ADVANCE_DAYS) };
}
