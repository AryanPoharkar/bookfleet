import type Stripe from "stripe";
export function verifyWebhook(input: { stripe: Stripe; body: string; signature: string | null; secret: string }): Stripe.Event | null {
 if (!input.signature) return null;
 try { return input.stripe.webhooks.constructEvent(input.body, input.signature, input.secret); } catch { return null; }
}
