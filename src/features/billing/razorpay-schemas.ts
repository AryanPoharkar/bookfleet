import { z } from "zod";
export const verifyPaymentInputSchema = z.object({ paymentId: z.string().regex(/^pay_[A-Za-z0-9]{1,40}$/), subscriptionId: z.string().regex(/^sub_[A-Za-z0-9]{1,40}$/), signature: z.string().regex(/^[a-f0-9]{64}$/) });
export const cancelRazorpayInputSchema = z.object({ when: z.enum(["now", "cycle_end"]) });
