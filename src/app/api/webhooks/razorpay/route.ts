import { handleRazorpayWebhook } from "@/server/razorpay/handle-webhook";
export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> { return handleRazorpayWebhook(request); }
