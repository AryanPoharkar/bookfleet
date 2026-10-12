"use server";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { getRazorpayConfig, getRazorpayPlanMap } from "@/server/razorpay/config";
import { createRazorpayClient } from "@/server/razorpay/client";
import { startRazorpayCheckout, verifyRazorpayPayment, cancelRazorpaySubscription } from "@/server/razorpay/billing-service";
import { verifyCheckoutSignature } from "@/server/razorpay/signatures";
import { verifyPaymentInputSchema, cancelRazorpayInputSchema } from "./razorpay-schemas";
import { razorpayMessage } from "./razorpay-messages";
function isRedirect(error: unknown): boolean { return Boolean(error && typeof error === "object" && "digest" in error); }
function errorResult(code: string) { return { error: code, message: razorpayMessage(code) }; }
export async function startRazorpayCheckoutAction(slug: string, input: unknown) {
  let tenant: Awaited<ReturnType<typeof requireTenant>>; try { tenant = await requireTenant(slug); requirePermission(tenant, "billing:manage"); } catch (error) { if (isRedirect(error)) throw error; notFound(); }
  if (input !== "PRO" && input !== "BUSINESS") return errorResult("INVALID_INPUT");
  let config; let planMap; try { config = getRazorpayConfig(); planMap = getRazorpayPlanMap(); } catch { return errorResult("NOT_CONFIGURED"); }
  // RATE-LIMIT-PLACEHOLDER (chunk 12)
  const result = await startRazorpayCheckout({ db: tenant.db, businessId: tenant.business.id, user: { name: tenant.user.name, email: tenant.user.email }, plan: input, client: createRazorpayClient(config), planMap, keyId: config.keyId });
  if (!result.ok) return errorResult(result.error); revalidatePath(`/app/${slug}/billing`); return { success: true, ...result.value };
}
export async function verifyRazorpayPaymentAction(slug: string, input: unknown) {
  let tenant: Awaited<ReturnType<typeof requireTenant>>; try { tenant = await requireTenant(slug); requirePermission(tenant, "billing:manage"); } catch (error) { if (isRedirect(error)) throw error; notFound(); }
  const parsed = verifyPaymentInputSchema.safeParse(input); if (!parsed.success) return errorResult("PAYMENT_NOT_VERIFIED");
  let config; let planMap; try { config = getRazorpayConfig(); planMap = getRazorpayPlanMap(); } catch { return errorResult("NOT_CONFIGURED"); }
  const result = await verifyRazorpayPayment({ businessId: tenant.business.id, input: parsed.data, client: createRazorpayClient(config), planMap, secret: config.keySecret, verifySignature: verifyCheckoutSignature });
  if (!result.ok) return errorResult(result.error); revalidatePath(`/app/${slug}/billing`); return { success: true, ...result.value };
}
export async function cancelRazorpaySubscriptionAction(slug: string, input: unknown) {
  let tenant: Awaited<ReturnType<typeof requireTenant>>; try { tenant = await requireTenant(slug); requirePermission(tenant, "billing:manage"); } catch (error) { if (isRedirect(error)) throw error; notFound(); }
  const parsed = cancelRazorpayInputSchema.safeParse(input); if (!parsed.success) return errorResult("INVALID_INPUT");
  let config; try { config = getRazorpayConfig(); } catch { return errorResult("NOT_CONFIGURED"); }
  // RATE-LIMIT-PLACEHOLDER (chunk 12)
  const result = await cancelRazorpaySubscription({ db: tenant.db, when: parsed.data.when, client: createRazorpayClient(config) });
  if (!result.ok) return errorResult(result.error); revalidatePath(`/app/${slug}/billing`); revalidatePath(`/app/${slug}`); return { success: true, ...result.value };
}
