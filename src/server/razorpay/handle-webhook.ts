import { createHash } from "node:crypto";
import { db } from "@/server/db";
import { getRazorpayPlanMap, getRazorpayWebhookSecret } from "./config";
import { verifyWebhookSignature } from "./signatures";
import { toRazorpayBillingEvent } from "./to-billing-event";
import { applyBillingEvent } from "../stripe/apply-billing-event";
export async function handleRazorpayWebhook(request: Request): Promise<Response> {
  const body = await request.text(); const secret = getRazorpayWebhookSecret();
  if (!secret) return Response.json({ error: "NOT_CONFIGURED" }, { status: 500 });
  const signature = request.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature({ body, signature, secret })) return Response.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  let priceMap; try { priceMap = getRazorpayPlanMap(); } catch { return Response.json({ error: "NOT_CONFIGURED" }, { status: 500 }); }
  const headerId = request.headers.get("x-razorpay-event-id");
  const eventId = headerId ? `rzp_${headerId}` : `rzp_body_${createHash("sha256").update(body).digest("hex")}`;
  let payload: unknown; try { payload = JSON.parse(body); } catch { return Response.json({ received: true }); }
  const eventName = typeof payload === "object" && payload !== null && "event" in payload && typeof payload.event === "string" ? payload.event : "unknown";
  const event = toRazorpayBillingEvent({ body: payload, eventId }); if (!event) return Response.json({ received: true });
  try { const result = await applyBillingEvent({ db, event, priceMap }); return Response.json({ received: true, result }); }
  catch { console.error("[razorpay] webhook failed", { eventId, eventName }); return Response.json({ error: "WEBHOOK_FAILED" }, { status: 500 }); }
}
