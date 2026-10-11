import { isValidDateString } from "../availability/local-time";
export type BookingFilters = { view: "day" | "week" | "list"; date?: string; staff?: string; status?: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW"; when: "upcoming" | "past" | "all"; service?: string; q: string; page: number; booking?: string };
type Raw = Record<string, string | string[] | undefined>;
const statuses = ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
function first(v: string | string[] | undefined) { return Array.isArray(v) ? v[0] : v; }
function id(v: string | undefined) { return v && v.length >= 1 && v.length <= 40 ? v : undefined; }
export function parseBookingFilters(raw: Raw): BookingFilters {
 const view = first(raw.view); const when = first(raw.when); const status = first(raw.status); const date = first(raw.date); const page = Number(first(raw.page)); const q = (first(raw.q) ?? "").trim().slice(0,80);
 return { view: view === "week" || view === "list" ? view : "day", ...(date && isValidDateString(date) ? { date } : {}), ...(id(first(raw.staff)) ? { staff: id(first(raw.staff)) } : {}), ...(statuses.includes(status as typeof statuses[number]) ? { status: status as BookingFilters["status"] } : {}), when: when === "past" || when === "all" ? when : "upcoming", ...(id(first(raw.service)) ? { service: id(first(raw.service)) } : {}), q, page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1, ...(id(first(raw.booking)) ? { booking: id(first(raw.booking)) } : {}) };
}
export function bookingsHref(slug: string, partial: Partial<BookingFilters>) { const p = new URLSearchParams(); const order: (keyof BookingFilters)[] = ["view","date","staff","status","when","service","q","page","booking"]; for (const key of order) { const value = partial[key]; if (value === undefined || value === "" || (key === "view" && value === "day") || (key === "when" && value === "upcoming") || (key === "page" && value === 1)) continue; p.set(key, String(value)); } const query = p.toString(); return `/app/${slug}/bookings${query ? `?${query}` : ""}`; }
