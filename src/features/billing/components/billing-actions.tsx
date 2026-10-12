"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startCheckoutAction, openPortalAction } from "../actions";
import { runMockAction } from "../mock-actions";
import { startRazorpayCheckoutAction, verifyRazorpayPaymentAction } from "../razorpay-actions";
import type { BillingMode } from "@/server/stripe/billing-mode";

// CSP (chunk 16): allow checkout.razorpay.com and api.razorpay.com.
let checkoutScript: Promise<void> | null = null;
function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Checkout is unavailable."));
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScript) checkoutScript = new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = () => resolve(); script.onerror = () => { checkoutScript = null; reject(new Error("Checkout could not be loaded.")); }; document.body.appendChild(script); });
  return checkoutScript;
}
export function BillingActionButton({ slug, plan, label, mode }: { slug: string; plan?: "PRO" | "BUSINESS"; label: string; mode: BillingMode }) {
  const [pending, startTransition] = useTransition(); const [error, setError] = useState(""); const router = useRouter();
  const unavailable = mode === "unavailable" && Boolean(plan);
  return <div className="min-w-0"><button type="button" disabled={pending || unavailable} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50" onClick={() => startTransition(async () => {
    setError("");
    if (mode === "mock" && plan) { const result = await runMockAction(slug, { kind: "change_plan", plan }); if (result && "message" in result) { setError(result.message ?? "The billing action failed. Please try again."); return; } toast.success("Mock payment applied"); router.refresh(); return; }
    if (mode === "razorpay" && plan) {
      const result = await startRazorpayCheckoutAction(slug, plan);
      if (!result || "error" in result || !result.checkout) { setError(result && "message" in result ? result.message ?? "The billing action failed." : "The billing action failed."); return; }
      try { await loadRazorpay(); const checkout = result.checkout; const RazorpayCheckout = window.Razorpay; if (!RazorpayCheckout) throw new Error("Checkout is unavailable."); const instance = new RazorpayCheckout({ key: checkout.keyId, subscription_id: checkout.subscriptionId, name: checkout.name, description: checkout.description, prefill: checkout.prefill, theme: { color: "#1F5F4F" }, handler: async (response) => { const verified = await verifyRazorpayPaymentAction(slug, { paymentId: response.razorpay_payment_id, subscriptionId: response.razorpay_subscription_id, signature: response.razorpay_signature }); if (verified && "error" in verified) { setError(verified.message ?? "Payment verification failed."); return; } toast.success("Payment received. Waiting for Razorpay to confirm."); router.replace(`/app/${slug}/billing?checkout=success`); }, modal: { ondismiss: () => toast("Checkout closed. You haven't been charged.") } }); instance.on("payment.failed", () => toast.error("The payment didn't go through. You haven't been charged.")); instance.open(); } catch { setError("Checkout could not be loaded. Please try again."); } return;
    }
    const result = plan ? await startCheckoutAction(slug, { plan }) : await openPortalAction(slug); if (result && "message" in result) setError(result.message ?? "The billing action failed. Please try again.");
  })}>{pending ? "Please wait..." : label}</button>{unavailable ? <p className="mt-2 text-xs text-muted-foreground">Paid plans aren&apos;t available on this server yet.</p> : null}{error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}</div>;
}
