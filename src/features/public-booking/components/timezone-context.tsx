/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { zoneCityName } from "../time-display";
type TimezoneState = { businessZone: string; visitorZone: string | null; mode: "business" | "visitor"; setMode: (mode: "business" | "visitor") => void };
const Context = createContext<TimezoneState | null>(null);
export function TimezoneProvider({ businessZone, children }: { businessZone: string; children: React.ReactNode }) { const [visitorZone, setVisitorZone] = useState<string | null>(null); const [mode, setMode] = useState<"business" | "visitor">("business"); useEffect(() => { setVisitorZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"); }, []); return <Context.Provider value={{ businessZone, visitorZone, mode, setMode }}>{children}</Context.Provider>; }
export function useTimezone() { const value = useContext(Context); if (!value) throw new Error("TimezoneProvider is missing."); return value; }
export function TimezoneSwitch() { const { businessZone, visitorZone, mode, setMode } = useTimezone(); if (!visitorZone || visitorZone === businessZone) return null; return <label className="flex items-center gap-3 text-sm"><Switch checked={mode === "visitor"} onCheckedChange={(checked) => setMode(checked ? "visitor" : "business")} />Show times in my time zone ({zoneCityName(visitorZone)})</label>; }
export function ZonedDateTime({ instant, timeZone }: { instant: Date; timeZone?: string }) { const context = useTimezone(); const zone = timeZone ?? (context.mode === "visitor" && context.visitorZone ? context.visitorZone : context.businessZone); const { formatLongDateTime, zoneCityName } = requireTimeDisplay(); return <time dateTime={instant.toISOString()}>{formatLongDateTime(instant, zone)}{context.mode === "visitor" && context.visitorZone && context.visitorZone !== context.businessZone ? ` (${zoneCityName(zone)} time)` : ""}</time>; }
function requireTimeDisplay() { return { formatLongDateTime: (instant: Date, zone: string) => new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(instant), zoneCityName }; }
