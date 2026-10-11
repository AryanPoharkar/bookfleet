import { TZDate } from "@date-fns/tz";
import { getLocalDateString } from "../availability/local-time";
export function localMinuteOfDay(instant: Date, timezone: string) { const d=new TZDate(instant.getTime(),timezone); return d.getHours()*60+d.getMinutes(); }
export function getLocalMinutes({ startsAt, endsAt, date, timezone }: { startsAt: Date; endsAt: Date; date: string; timezone: string }) { const startDate=getLocalDateString(startsAt,timezone); const endDate=getLocalDateString(endsAt,timezone); return { startMinute: startDate < date ? 0 : localMinuteOfDay(startsAt,timezone), endMinute: endDate > date ? 1440 : localMinuteOfDay(endsAt,timezone) }; }
