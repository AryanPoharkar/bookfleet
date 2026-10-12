import { createHmac, timingSafeEqual } from "node:crypto";
function safeHexEqual(expected: string, actual: string): boolean {
  if (!/^[a-f0-9]+$/i.test(actual) || actual.length !== expected.length) return false;
  const a = Buffer.from(expected, "hex"); const b = Buffer.from(actual, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export function verifyWebhookSignature(input: { body: string; signature: string | null; secret: string }): boolean {
  try { if (!input.signature || !input.secret) return false; const expected = createHmac("sha256", input.secret).update(input.body, "utf8").digest("hex"); return safeHexEqual(expected, input.signature); } catch { return false; }
}
export function verifyCheckoutSignature(input: { paymentId: string; subscriptionId: string; signature: string; secret: string }): boolean {
  try { if (!input.paymentId || !input.subscriptionId || !input.signature || !input.secret) return false; const expected = createHmac("sha256", input.secret).update(`${input.paymentId}|${input.subscriptionId}`, "utf8").digest("hex"); return safeHexEqual(expected, input.signature); } catch { return false; }
}
