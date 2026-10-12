import { createHmac, timingSafeEqual } from "node:crypto";

/** Verify Razorpay's X-Razorpay-Signature against the exact raw request body. */
export function verifyRazorpayWebhook(input: { body: string; signature: string | null; secret: string }): boolean {
  if (!input.signature || !input.secret) return false;
  const expected = createHmac("sha256", input.secret).update(input.body, "utf8").digest("hex");
  const actualBuffer = Buffer.from(input.signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
