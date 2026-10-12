import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyCheckoutSignature, verifyWebhookSignature } from "@/server/razorpay/signatures";
import { getRazorpayConfig, getRazorpayPlanMap, isRazorpayConfigured } from "@/server/razorpay/config";
import { mapRazorpayStatus } from "@/server/razorpay/status";
import { toRazorpayBillingEvent } from "@/server/razorpay/to-billing-event";
import { createRazorpayClient, RazorpayApiError } from "@/server/razorpay/client";
import { verifyPaymentInputSchema, cancelRazorpayInputSchema } from "@/features/billing/razorpay-schemas";
import { razorpayMessage } from "@/features/billing/razorpay-messages";
import { PLANS } from "@/config/plans";

const secret = "test-secret";
const hmac = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
const env = { RAZORPAY_KEY_ID: "rzp_test_xxxx", RAZORPAY_KEY_SECRET: "secret", RAZORPAY_WEBHOOK_SECRET: "webhook", RAZORPAY_PLAN_PRO: "plan_pro", RAZORPAY_PLAN_BUSINESS: "plan_business" };

describe("Razorpay signatures", () => {
  it("validates raw webhook body and rejects tampering", () => { const body = '{"event":"subscription.activated"}'; expect(verifyWebhookSignature({ body, signature: hmac(body), secret })).toBe(true); expect(verifyWebhookSignature({ body: `${body} `, signature: hmac(body), secret })).toBe(false); });
  it("validates checkout payment signatures", () => { const value = "pay_abc|sub_abc"; expect(verifyCheckoutSignature({ paymentId: "pay_abc", subscriptionId: "sub_abc", signature: hmac(value), secret })).toBe(true); expect(verifyCheckoutSignature({ paymentId: "pay_abc", subscriptionId: "sub_other", signature: hmac(value), secret })).toBe(false); });
});
describe("Razorpay configuration and mapping", () => {
  it("requires test keys and valid plan ids", () => { expect(getRazorpayConfig(env).keyId).toBe("rzp_test_xxxx"); expect(getRazorpayPlanMap(env)).toEqual({ PRO: "plan_pro", BUSINESS: "plan_business" }); expect(() => getRazorpayConfig({ ...env, RAZORPAY_KEY_ID: "rzp_live_x" })).toThrow("Bookfleet only runs Razorpay in test mode"); expect(isRazorpayConfigured(env)).toBe(true); expect(isRazorpayConfigured({})).toBe(false); });
  it("maps all known subscription statuses", () => { expect(mapRazorpayStatus("created")).toBe("incomplete"); expect(mapRazorpayStatus("authenticated")).toBe("incomplete"); expect(mapRazorpayStatus("active")).toBe("active"); expect(mapRazorpayStatus("pending")).toBe("past_due"); expect(mapRazorpayStatus("halted")).toBe("unpaid"); expect(mapRazorpayStatus("paused")).toBe("paused"); expect(mapRazorpayStatus("cancelled")).toBe("canceled"); expect(mapRazorpayStatus("completed")).toBe("canceled"); expect(mapRazorpayStatus("expired")).toBe("incomplete_expired"); expect(mapRazorpayStatus("unknown")).toBe("incomplete"); });
  it("maps subscription events with the provider marker", () => {
    const body = {
      event: "subscription.activated",
      payload: { subscription: { entity: { id: "sub_1", plan_id: "plan_pro", status: "active", customer_id: "cust_1", notes: { businessId: "biz_1" } } } },
    };
    const event = toRazorpayBillingEvent({ eventId: "rzp_evt_1", body });
    expect(event).toMatchObject({ provider: "razorpay", kind: "checkout_completed", businessId: "biz_1", subscription: { id: "sub_1", priceId: "plan_pro", status: "active" } });
    const invalid = toRazorpayBillingEvent({ eventId: "x", body: { event: "subscription.authenticated", payload: { subscription: { entity: { id: "sub_1", plan_id: "plan_pro", status: "authenticated", notes: [] } } } } });
    expect(invalid).toBeNull();
  });
  it("validates checkout and cancellation inputs and messages", () => { expect(verifyPaymentInputSchema.safeParse({ paymentId: "pay_123", subscriptionId: "sub_123", signature: "a".repeat(64) }).success).toBe(true); expect(verifyPaymentInputSchema.safeParse({ paymentId: "bad", subscriptionId: "sub_123", signature: "a".repeat(64) }).success).toBe(false); expect(cancelRazorpayInputSchema.safeParse({ when: "cycle_end" }).success).toBe(true); expect(razorpayMessage("PROVIDER_ERROR")).toBe("We couldn't reach Razorpay. Please try again."); expect(razorpayMessage("PAYMENT_NOT_VERIFIED")).toContain("If you were charged"); expect(razorpayMessage("NO_SUBSCRIPTION")).toBe("There is no active subscription to cancel."); expect(PLANS.PRO.priceMonthlyInrPaise).toBe(149900); expect(PLANS.BUSINESS.priceMonthlyInrPaise).toBe(399900); });
});
describe("Razorpay API client", () => {
  it("sends authenticated subscription requests and parses notes", async () => { let calledUrl = ""; let calledInit: RequestInit | undefined; const client = createRazorpayClient({ keyId: "rzp_test_x", keySecret: "secret", fetchImpl: async (input, init) => { calledUrl = String(input); calledInit = init; return Response.json({ id: "sub_1", plan_id: "plan_pro", status: "created", customer_id: null, notes: [] }); } }); const result = await client.createSubscription({ planId: "plan_pro", totalCount: 120, notes: { businessId: "biz_1" } }); expect(calledUrl).toBe("https://api.razorpay.com/v1/subscriptions"); expect(calledInit?.method).toBe("POST"); expect(new Headers(calledInit?.headers).get("Authorization")).toContain("Basic "); expect(result).toMatchObject({ id: "sub_1", planId: "plan_pro", notes: {} }); });
  it("returns safe API errors without leaking response body", async () => { const client = createRazorpayClient({ keyId: "rzp_test_x", keySecret: "secret", fetchImpl: async () => Response.json({ error: { code: "BAD_REQUEST_ERROR", description: "secret body" } }, { status: 400 }) }); await expect(client.fetchSubscription("sub_1")).rejects.toMatchObject({ httpStatus: 400, razorpayCode: "BAD_REQUEST_ERROR" }); await expect(client.fetchSubscription("sub_1")).rejects.toBeInstanceOf(RazorpayApiError); });
  it("uses GET for lookup and the correct cancel payload", async () => { const calls: { url: string; method: string; body: string | null }[] = []; const client = createRazorpayClient({ keyId: "rzp_test_x", keySecret: "secret", fetchImpl: async (input, init) => { calls.push({ url: String(input), method: init?.method ?? "GET", body: typeof init?.body === "string" ? init.body : null }); return Response.json({ id: "sub_1", plan_id: "plan_pro", status: "active", notes: {} }); } }); await client.fetchSubscription("sub_1"); await client.cancelSubscription("sub_1", true); expect(calls[0]).toMatchObject({ method: "GET", url: "https://api.razorpay.com/v1/subscriptions/sub_1" }); expect(calls[1]).toMatchObject({ method: "POST", body: JSON.stringify({ cancel_at_cycle_end: 1 }) }); });
  it("rejects malformed Razorpay API responses", async () => { const client = createRazorpayClient({ keyId: "rzp_test_x", keySecret: "secret", fetchImpl: async () => Response.json({ id: "sub_1" }) }); await expect(client.fetchSubscription("sub_1")).rejects.toBeTruthy(); });
});
