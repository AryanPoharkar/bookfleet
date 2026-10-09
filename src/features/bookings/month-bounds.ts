import { getLocalDateString, localMinuteToUtc } from "../availability/local-time";

export function getMonthBounds(instant: Date, timezone: string): { start: Date; end: Date } {
  const localDate = getLocalDateString(instant, timezone);
  const [yearPart, monthPart] = localDate.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const endDate = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}-01`;
  return { start: localMinuteToUtc(startDate, 0, timezone), end: localMinuteToUtc(endDate, 0, timezone) };
}
