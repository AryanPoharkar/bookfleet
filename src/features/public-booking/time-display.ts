const parts = (instant: Date, timeZone: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone, ...options }).formatToParts(instant);
export function formatSlotLabel({ instant, timeZone, anchorDate }: { instant: Date; timeZone: string; anchorDate: string }) { const p = parts(instant, timeZone, { hour: "numeric", minute: "2-digit" }); const hour = p.find((x) => x.type === "hour")?.value ?? ""; const minute = p.find((x) => x.type === "minute")?.value ?? "00"; const dayPeriod = p.find((x) => x.type === "dayPeriod")?.value ?? ""; const dateParts = parts(instant, timeZone, { weekday: "short", day: "2-digit", year: "numeric", month: "2-digit" }); const value = `${hour}:${minute} ${dayPeriod}`; const y = dateParts.find((x) => x.type === "year")?.value; const m = dateParts.find((x) => x.type === "month")?.value; const d = dateParts.find((x) => x.type === "day")?.value; return `${value}${`${y}-${m}-${d}` !== anchorDate ? ` (${dateParts.find((x) => x.type === "weekday")?.value} ${Number(d)})` : ""}`; }
export function formatLongDateTime(instant: Date, timeZone: string) { const p = parts(instant, timeZone, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); const get = (type: string) => p.find((x) => x.type === type)?.value ?? ""; return `${get("weekday")}, ${get("month")} ${get("day")} at ${get("hour")}:${get("minute")} ${get("dayPeriod")}`; }
export function zoneCityName(timeZone: string) { if (timeZone === "UTC") return "UTC"; return timeZone.split("/").at(-1)?.replaceAll("_", " ") ?? timeZone; }
export function dateToString(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
export function stringToDate(value: string): Date {
  const parts = value.split("-").map(Number);
  const year = parts[0] ?? Number.NaN;
  const month = parts[1] ?? Number.NaN;
  const day = parts[2] ?? Number.NaN;
  return new Date(year, month - 1, day);
}
