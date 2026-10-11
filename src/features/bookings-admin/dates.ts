import { addDays } from "date-fns";
import { isValidDateString } from "../availability/local-time";
function stringToDate(value: string) { if (!isValidDateString(value)) throw new RangeError("Invalid date string"); return new Date(`${value}T00:00:00.000Z`); }
function dateToString(value: Date) { return `${value.getUTCFullYear()}-${String(value.getUTCMonth()+1).padStart(2,"0")}-${String(value.getUTCDate()).padStart(2,"0")}`; }
export function addDaysToDateString(date: string, n: number) { return dateToString(addDays(stringToDate(date), n)); }
export function getWeekStart(date: string) { const d=stringToDate(date); const offset=(d.getUTCDay()+6)%7; return dateToString(addDays(d,-offset)); }
export function getWeekDates(date: string) { const start=getWeekStart(date); return Array.from({length:7},(_,i)=>addDaysToDateString(start,i)); }
export function formatDayHeading(date: string) { return new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"}).format(stringToDate(date)); }
