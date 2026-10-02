import { z } from "zod";
import { BUFFERS, DURATIONS } from "./options";
export const serviceSchema = z.object({ name: z.string().trim().min(2).max(80), durationMinutes: z.number().int().refine((v) => (DURATIONS as readonly number[]).includes(v)), bufferMinutes: z.number().int().refine((v) => (BUFFERS as readonly number[]).includes(v)), price: z.string().regex(/^\d{1,6}(\.\d{1,2})?$/) });
export type ServiceInput = z.infer<typeof serviceSchema>;
