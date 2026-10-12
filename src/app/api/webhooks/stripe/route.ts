import { handleStripeWebhook } from "@/server/stripe/handle-webhook";

export async function POST(request: Request): Promise<Response> {
  return handleStripeWebhook(request);
}
