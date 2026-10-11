import { z } from "zod";
export const startCheckoutInputSchema = z.object({ plan: z.enum(["PRO", "BUSINESS"]) });
