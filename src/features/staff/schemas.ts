import { z } from "zod";
export const staffSchema = z.object({ name:z.string().trim().min(2).max(60), bio:z.string().trim().max(500), userId:z.string().max(40), serviceIds:z.array(z.string().min(1)).max(50).refine(a=>new Set(a).size===a.length,"Choose each service only once.") });
export type StaffInput=z.infer<typeof staffSchema>;
