"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { runMockAction } from "../mock-actions";
import type { MockActionInput } from "@/server/stripe/mock/build-event";
import { getMockPanelState } from "../mock-panel-state";

type Props = { slug: string; plan?: "FREE" | "PRO" | "BUSINESS"; subscriptionStatus?: string | null; hasSubscriptionIds?: boolean };
export function MockBillingPanel({ slug, plan = "FREE", subscriptionStatus = null, hasSubscriptionIds = false }: Props) {
  const [pending, startTransition] = useTransition(); const [error, setError] = useState(""); const router = useRouter();
  const state = getMockPanelState({ plan, subscriptionStatus, hasSubscriptionIds });
  const actions: { label: string; input: MockActionInput; disabled?: boolean; destructive?: boolean }[] = [
    ...(["PRO", "BUSINESS"] as const).map((target) => { const mode = state.switchButtons[target]; const name = target === "PRO" ? "Pro" : "Business"; return { label: mode === "current" ? `${name} (current)` : mode === "start" ? `Start ${name}` : `Switch to ${name}`, input: { kind: "change_plan", plan: target } as MockActionInput, disabled: mode === "current" }; }),
    { label: "Payment failed", input: { kind: "payment_failed" }, disabled: !state.paymentFailed, destructive: true },
    { label: "Payment recovered", input: { kind: "payment_recovered" }, disabled: !state.paymentRecovered },
    { label: "Cancel subscription now", input: { kind: "cancel" }, disabled: !state.cancel, destructive: true },
  ];
  return <section aria-label="Simulate billing events" className="space-y-3 rounded-lg border p-4"><h3 className="font-medium">Simulate billing events (development only)</h3><div className="flex flex-wrap gap-2">{actions.map((action) => <button key={action.label} type="button" disabled={pending || action.disabled} title={action.disabled && !action.label.includes("current") ? "Needs an active subscription." : undefined} className={`rounded-md border px-3 py-2 text-sm disabled:opacity-50 ${action.destructive ? "border-destructive/50" : ""}`} onClick={() => startTransition(async () => { setError(""); const result = await runMockAction(slug, action.input); if (result && "message" in result) { setError(result.message ?? "The billing action failed. Please try again."); return; } toast.success("Mock billing event applied"); router.refresh(); })}>{pending ? "Please wait..." : action.label}</button>)}</div>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</section>;
}
