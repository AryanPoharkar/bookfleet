import { z } from "zod";
import { isValidDateString } from "@/features/availability/local-time";
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(40);
export const availabilityQuerySchema = z.object({ slug: slugSchema, serviceId: z.string().min(1).max(40), staffId: z.string().min(1).max(40).optional(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidDateString), rescheduleToken: z.string().regex(/^[A-Za-z0-9_-]{32}$/).optional() });
