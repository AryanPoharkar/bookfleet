import { z } from "zod";
import { isValidDateString } from "../availability/local-time";
import { onboardingSchema } from "../onboarding/schemas";
import { ACCENT_COLORS } from "../public-booking/accent-colors";
const localDate = z.string().refine(isValidDateString,"Choose a valid date.");
export const cancelReasonSchema = z.string().trim().max(200).transform(v=>v===""?undefined:v).optional();
export const markStatusSchema = z.object({bookingId:z.string().min(1).max(40),status:z.enum(["COMPLETED","NO_SHOW"])});
export const slotsQuerySchema = z.discriminatedUnion("kind",[z.object({kind:z.literal("new"),serviceId:z.string().min(1).max(40),staffId:z.string().min(1).max(40).nullable(),date:localDate}),z.object({kind:z.literal("reschedule"),bookingId:z.string().min(1).max(40),date:localDate})]);
export const settingsSchema = z.object({name:z.string().trim().min(2).max(60),timezone:onboardingSchema.shape.timezone,currency:onboardingSchema.shape.currency,accentColor:z.string().refine(v=>ACCENT_COLORS.some(c=>c.hex.toLowerCase()===v.toLowerCase()),"Choose an available accent colour.").transform(v=>v.toUpperCase())});
