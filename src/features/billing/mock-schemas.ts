import { z } from "zod";

export const mockActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("checkout"), plan: z.enum(["PRO", "BUSINESS"]) }),
  z.object({ kind: z.literal("change_plan"), plan: z.enum(["PRO", "BUSINESS"]) }),
  z.object({ kind: z.literal("payment_failed") }),
  z.object({ kind: z.literal("payment_recovered") }),
  z.object({ kind: z.literal("cancel") }),
]);
