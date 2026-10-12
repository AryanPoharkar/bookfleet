import { z } from "zod";
import { RAZORPAY_API_BASE } from "./config";
export class RazorpayApiError extends Error { constructor(public readonly httpStatus: number, public readonly razorpayCode: string | null) { super(`Razorpay request failed (${httpStatus})`); this.name = "RazorpayApiError"; } }
const responseSchema = z.object({ id: z.string(), plan_id: z.string(), status: z.string(), customer_id: z.string().nullable().optional(), notes: z.union([z.record(z.string(), z.string()), z.array(z.unknown())]).optional() });
export type RazorpaySubscription = { id: string; planId: string; status: string; customerId: string | null; notes: Record<string, string> };
export type RazorpayClient = ReturnType<typeof createRazorpayClient>;
export function createRazorpayClient(input: { keyId: string; keySecret: string; fetchImpl?: typeof fetch }) {
  const fetchImpl = input.fetchImpl ?? fetch;
  async function request(path: string, init: RequestInit): Promise<RazorpaySubscription> {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetchImpl(`${RAZORPAY_API_BASE}${path}`, { ...init, signal: controller.signal, headers: { Authorization: `Basic ${Buffer.from(`${input.keyId}:${input.keySecret}`).toString("base64")}`, "Content-Type": "application/json", ...init.headers } });
      if (!response.ok) { let code: string | null = null; try { const body: unknown = await response.json(); if (typeof body === "object" && body !== null && "error" in body) { const error = body.error; if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") code = error.code; } } catch {} throw new RazorpayApiError(response.status, code); }
      const raw: unknown = await response.json(); const parsed = responseSchema.parse(raw);
      const notes: Record<string, string> = {}; if (parsed.notes && !Array.isArray(parsed.notes)) Object.assign(notes, parsed.notes);
      return { id: parsed.id, planId: parsed.plan_id, status: parsed.status, customerId: parsed.customer_id ?? null, notes };
    } finally { clearTimeout(timeout); }
  }
  return {
    createSubscription: (args: { planId: string; totalCount: number; notes: Record<string, string> }) => request("/subscriptions", { method: "POST", body: JSON.stringify({ plan_id: args.planId, total_count: args.totalCount, quantity: 1, notes: args.notes }) }),
    fetchSubscription: (id: string) => request(`/subscriptions/${encodeURIComponent(id)}`, { method: "GET" }),
    cancelSubscription: (id: string, atCycleEnd: boolean) => request(`/subscriptions/${encodeURIComponent(id)}/cancel`, { method: "POST", body: JSON.stringify({ cancel_at_cycle_end: atCycleEnd ? 1 : 0 }) }),
  };
}
