"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { runMockAction } from "../mock-actions";
import type { MockActionInput } from "@/server/stripe/mock/build-event";

const actions: { label: string; input: MockActionInput; destructive?: boolean }[] = [
  { label: "Switch to Pro", input: { kind: "change_plan", plan: "PRO" } },
  { label: "Switch to Business", input: { kind: "change_plan", plan: "BUSINESS" } },
  { label: "Payment failed", input: { kind: "payment_failed" }, destructive: true },
  { label: "Payment recovered", input: { kind: "payment_recovered" } },
  { label: "Cancel subscription now", input: { kind: "cancel" }, destructive: true },
];

export function MockBillingPanel({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  return (
    <section aria-label="Simulate Stripe events" className="space-y-3 rounded-lg border p-4">
      <h3 className="font-medium">Simulate Stripe events (development only)</h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={pending}
            className={`rounded-md border px-3 py-2 text-sm disabled:opacity-50 ${action.destructive ? "border-destructive/50" : ""}`}
            onClick={() => startTransition(async () => {
              setError("");
              const result = await runMockAction(slug, action.input);
              if (result && "message" in result) {
                setError(result.message ?? "The billing action failed. Please try again.");
                return;
              }
              toast.success("Mock payment applied");
              router.refresh();
            })}
          >
            {pending ? "Please wait..." : action.label}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
