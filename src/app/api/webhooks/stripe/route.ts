import { handleStripeWebhook } from "@/server/stripe/handle-webhook";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleStripeWebhook(request); }
