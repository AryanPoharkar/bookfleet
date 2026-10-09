import { isValidDateString } from "@/features/availability/local-time";
export type BookingOptions = { services: { id: string; staff: { id: string }[] }[] };
type Range = { firstDate: string; lastDate: string };
type Params = { service?: string | string[]; staff?: string | string[]; date?: string | string[]; time?: string | string[]; rescheduleToken?: string | string[] };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
export function parseBookingParams(raw: Params, options: BookingOptions, range: Range) {
 const serviceId = first(raw.service); const staffValue = first(raw.staff); const dateValue = first(raw.date); const timeValue = first(raw.time);
 const service = options.services.find((item) => item.id === serviceId);
 if (!service) return { step: "service" as const };
 let staffId: string | undefined;
 if (service.staff.length === 1) staffId = service.staff[0]!.id;
 else if (staffValue === "any" || service.staff.some((person) => person.id === staffValue)) staffId = staffValue;
 if (!staffId) return { step: "staff" as const, serviceId };
 const date = dateValue && isValidDateString(dateValue) && dateValue >= range.firstDate && dateValue <= range.lastDate ? dateValue : undefined;
 const time = timeValue && timeValue.endsWith("Z") && Number.isFinite(Date.parse(timeValue)) ? timeValue : undefined;
 if (!date || !time) return { step: "time" as const, serviceId, staffId, ...(date ? { date } : {}) };
 return { step: "details" as const, serviceId, staffId, date, time };
}
export function bookingHref(slug: string, values: { service?: string; staff?: string; date?: string; time?: string }) { const params = new URLSearchParams(); if (values.service) params.set("service", values.service); if (values.staff) params.set("staff", values.staff); if (values.date) params.set("date", values.date); if (values.time) params.set("time", values.time); const query = params.toString(); return `/book/${slug}${query ? `?${query}` : ""}`; }
